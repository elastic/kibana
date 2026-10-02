/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { CoreServiceAccountsService } from '@kbn/core-security-server';

import {
  scheduleBoundServiceAccountBearer,
  serviceAccountIdFromExchangeBearer,
} from './service_account_bearer';

interface ScheduleOptions {
  request: KibanaRequest;
  cloneApiKey: true;
  [key: string]: unknown;
}

/**
 * Schedules a workflow task as its caller. A UIAM exchange bearer is stored as an account id and
 * exchanged when the task runs. Every other caller keeps the API-key clone.
 */
export const scheduleForCaller = async <T extends { params?: object }, R>({
  elasticsearch,
  serviceAccounts,
  request,
  executionId,
  spaceId,
  taskInstance,
  schedule,
}: {
  elasticsearch: IClusterClient;
  serviceAccounts: CoreServiceAccountsService;
  request: KibanaRequest;
  executionId: string;
  spaceId: string | undefined;
  taskInstance: T;
  schedule: (taskInstance: T, options?: ScheduleOptions) => Promise<R>;
}): Promise<R> => {
  const serviceAccountId = await serviceAccountIdFromExchangeBearer(elasticsearch, request);
  if (!serviceAccountId) {
    return schedule(taskInstance, { request, cloneApiKey: true });
  }
  return scheduleBoundServiceAccountBearer({
    serviceAccounts,
    request,
    executionId,
    spaceId,
    serviceAccountId,
    taskInstance,
    schedule,
  });
};
