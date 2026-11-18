/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  BulkScheduleWorkflowItem,
  GetWorkflowsParams,
  WorkflowsManagementApi,
} from './workflows_management_api';
import type { SearchWorkflowExecutionsParams } from './workflows_management_service';

export const createWorkflowsManagementClient = (
  api: WorkflowsManagementApi,
  request: KibanaRequest
) => ({
  getWorkflow: (id: string, spaceId: string) => api.getWorkflow(id, spaceId, request),
  getWorkflows: (
    params: GetWorkflowsParams,
    spaceId: string,
    options?: {
      includeExecutionHistory?: boolean;
      includeManagedExecutionHistory?: boolean;
    }
  ) => api.getWorkflows(params, spaceId, { ...options, request }),
  getWorkflowsByIds: (ids: string[], spaceId: string) =>
    api.getWorkflowsByIds(ids, spaceId, request),
  getWorkflowExecutions: (
    params: Omit<SearchWorkflowExecutionsParams, 'request'>,
    spaceId: string
  ) => api.getWorkflowExecutions({ ...params, request }, spaceId),
  getWorkflowExecution: (
    id: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => api.getWorkflowExecution(id, spaceId, { ...options, request }),
  bulkScheduleWorkflow: (items: BulkScheduleWorkflowItem[]) =>
    api.bulkScheduleWorkflow(items, request),
});

export type WorkflowsManagementClient = ReturnType<typeof createWorkflowsManagementClient>;
