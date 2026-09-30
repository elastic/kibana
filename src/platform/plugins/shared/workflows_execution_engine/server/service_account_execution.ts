/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';

export const WORKFLOW_SERVICE_ACCOUNT_TYPE = 'workflow';
const originalRequests = new WeakMap<KibanaRequest, KibanaRequest>();

export const getWorkflowOriginalRequest = (request: KibanaRequest): KibanaRequest =>
  originalRequests.get(request) ?? request;

export const withWorkflowExecutionIdentity = async <T>(
  core: CoreStart,
  execution: Pick<EsWorkflowExecution, 'workflowId' | 'spaceId' | 'workflowDefinition'>,
  request: KibanaRequest,
  execute: (request: KibanaRequest) => Promise<T>
): Promise<T> => {
  const originalRequest = getWorkflowOriginalRequest(request);
  const serviceAccountId = execution.workflowDefinition?.settings?.run_as;
  if (!serviceAccountId) {
    return execute(originalRequest);
  }
  if (!core.security.serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  return core.security.serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
      workloadId: execution.workflowId,
      spaceId: execution.spaceId,
      expectedServiceAccountId: serviceAccountId,
    },
    async (scopedRequest) => {
      originalRequests.set(scopedRequest, originalRequest);
      try {
        return await execute(scopedRequest);
      } finally {
        originalRequests.delete(scopedRequest);
      }
    }
  );
};
