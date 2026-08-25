/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowServiceAccountOperation } from './types';

export const WORKFLOW_SERVICE_ACCOUNT_OPERATION_TYPE = 'workflow_execution';
export const WORKFLOW_SERVICE_ACCOUNT_WORKLOAD_TYPE = 'workflow';

export const getWorkflowServiceAccountCoordinates = ({
  workflowId,
  spaceId,
}: {
  workflowId: string;
  spaceId: string;
}): Parameters<WorkflowServiceAccountOperation['getBinding']>[0] => ({
  workloadType: WORKFLOW_SERVICE_ACCOUNT_WORKLOAD_TYPE,
  workloadId: workflowId,
  spaceId,
});

export const withWorkflowServiceAccountRequest = async <T>({
  operation,
  workflowId,
  spaceId,
  serviceAccountId,
  fallbackRequest,
  fn,
}: {
  operation: WorkflowServiceAccountOperation;
  workflowId: string;
  spaceId: string;
  serviceAccountId: string | undefined;
  fallbackRequest: KibanaRequest;
  fn: (request: KibanaRequest) => Promise<T>;
}): Promise<T> => {
  if (!serviceAccountId) {
    return fn(fallbackRequest);
  }

  const coordinates = getWorkflowServiceAccountCoordinates({ workflowId, spaceId });
  const binding = await operation.getBinding(coordinates);
  if (binding?.serviceAccountId !== serviceAccountId) {
    throw new Error(
      `Workflow '${workflowId}' declares service account '${serviceAccountId}', but its authorized binding does not match: space '${spaceId}' contains '${
        binding?.serviceAccountId ?? 'missing'
      }'.`
    );
  }

  return operation.withScopedRequest(coordinates, fn);
};
