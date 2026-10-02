/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { CLOUD_SERVICE_ACCOUNT_REALM_TYPE } from '@kbn/core-security-common';
import {
  type CoreServiceAccountsService,
  HTTPAuthorizationHeader,
  isUiamBearerCredential,
} from '@kbn/core-security-server';
import { SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH } from '@kbn/security-plugin/common';

/**
 * Workload type for a run whose caller is a UIAM service account bearer.
 * Separate from `workflow`, which is the `settings.run_as` binding. The workload id is the
 * execution id, so one run does not replace another run's account. A wait or a Task Manager
 * retry still exchanges it. The task removes the binding once the execution is terminal and
 * that task will not run again.
 */
export const SERVICE_ACCOUNT_BEARER_TYPE = 'service_account_bearer';

export const storedServiceAccountId = (value: unknown): string | undefined =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH
    ? value
    : undefined;

/**
 * Returns the service account id when this request carries a UIAM `_exchange` bearer.
 * An API key returns undefined so Task Manager keeps cloning it.
 */
export const serviceAccountIdFromExchangeBearer = async (
  elasticsearch: IClusterClient,
  request: KibanaRequest
): Promise<string | undefined> => {
  if (!request.headers) {
    return undefined;
  }
  const header = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!header || !isUiamBearerCredential(header)) {
    return undefined;
  }
  const user = await elasticsearch.asScoped(request).asCurrentUser.security.authenticate();
  if (user.authentication_realm?.type !== CLOUD_SERVICE_ACCOUNT_REALM_TYPE) {
    return undefined;
  }
  return storedServiceAccountId(user.username);
};

/**
 * Binds this service account to the execution under {@link SERVICE_ACCOUNT_BEARER_TYPE}
 * when that binding is missing or names a different account.
 */
export const ensureServiceAccountBearerBinding = async (
  serviceAccounts: CoreServiceAccountsService,
  request: KibanaRequest,
  executionId: string,
  spaceId: string,
  serviceAccountId: string
): Promise<void> => {
  if (!serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  const binding = await serviceAccounts.getWorkloadBinding({
    workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
    workloadId: executionId,
    spaceId,
  });
  if (binding?.serviceAccountId === serviceAccountId) {
    return;
  }
  await serviceAccounts.bindWorkload(request, {
    workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
    workloadId: executionId,
    serviceAccountId,
  });
};

/**
 * Schedules a task that already knows its service account. Binds that account to the execution
 * and omits the request so Task Manager does not grant an API key.
 */
export const scheduleBoundServiceAccountBearer = async <T extends { params?: object }, R>({
  serviceAccounts,
  request,
  executionId,
  spaceId,
  serviceAccountId,
  taskInstance,
  schedule,
}: {
  serviceAccounts: CoreServiceAccountsService;
  request: KibanaRequest;
  executionId: string;
  spaceId: string | undefined;
  serviceAccountId: string;
  taskInstance: T;
  schedule: (taskInstance: T) => Promise<R>;
}): Promise<R> => {
  if (!spaceId) {
    throw new Error('Workflow execution must have a space to run as a service account.');
  }
  await ensureServiceAccountBearerBinding(
    serviceAccounts,
    request,
    executionId,
    spaceId,
    serviceAccountId
  );
  return schedule({
    ...taskInstance,
    params: { ...(taskInstance.params ?? {}), serviceAccountId },
  });
};

/**
 * Exchanges the `service_account_bearer` binding for this execution and runs the task as that
 * account. An API-key task already has a request from Task Manager and does not call this.
 */
export const runServiceAccountBearer = async <T>({
  serviceAccountId,
  serviceAccounts,
  spaceId,
  executionId,
  run,
}: {
  serviceAccountId: string | undefined;
  serviceAccounts: CoreServiceAccountsService;
  spaceId: string;
  executionId: string;
  run: (request: KibanaRequest) => Promise<T>;
}): Promise<T> => {
  if (!serviceAccountId) {
    throw new Error('Workflow execution not found.');
  }
  return serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
      workloadId: executionId,
      spaceId,
      expectedServiceAccountId: serviceAccountId,
    },
    run
  );
};

const isMissingWorkloadBinding = (error: unknown): boolean =>
  Boom.isBoom(error) && error.output.statusCode === 404;

/**
 * Removes the `service_account_bearer` binding for this execution.
 * Call only when the execution is terminal and this task will not retry: a wait still
 * exchanges the same binding. A binding that is already gone is success. Any other
 * delete failure is logged and does not fail the run.
 */
export const releaseServiceAccountBearerBinding = async ({
  serviceAccounts,
  spaceId,
  executionId,
  serviceAccountId,
  logger,
}: {
  serviceAccounts: CoreServiceAccountsService;
  spaceId: string;
  executionId: string;
  serviceAccountId: string;
  logger: Logger;
}): Promise<void> => {
  if (!serviceAccounts.isEnabled()) {
    return;
  }
  try {
    await serviceAccounts.withScopedRequestForWorkload(
      {
        workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
        workloadId: executionId,
        spaceId,
        expectedServiceAccountId: serviceAccountId,
      },
      async (request) => {
        await serviceAccounts.unbindWorkload(request, {
          workloadType: SERVICE_ACCOUNT_BEARER_TYPE,
          workloadId: executionId,
        });
      }
    );
  } catch (error) {
    if (isMissingWorkloadBinding(error)) {
      return;
    }
    logger.warn(
      `Failed to release the service account binding for execution ${executionId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
