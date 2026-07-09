/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ExecutionError } from './errors/execution_error';
export { loadWorkflowExampleContent } from './examples';
export { validateWorkflowForExecution } from './lib/validate_workflow_for_execution';
export { buildWorkflowFilters } from './lib/workflow_filters';
export type {
  BuildWorkflowFiltersParams,
  DeletedFilter,
  ManagedFilter,
  WorkflowQueryFilter,
} from './lib/workflow_filters';
export type { WorkflowsApiRequestHandlerContext, WorkflowsClient } from './types';

export { WorkflowRepository } from './repositories/workflow_repository';
export { GLOBAL_WORKFLOW_SPACE_ID } from './constants';

export {
  getStepExecutionsByWorkflowExecution,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
  TOKEN_USAGE_MAPPING,
  createOrUpdateIndex,
  createIndexWithMappings,
  createWorkflowExecutionsDataAccess,
  createStepExecutionsDataAccess,
  executeIndexBulkUpsert,
  normalizeUpsertDocuments,
  assertUpsertDocumentsHaveIds,
  throwBulkUpsertError,
  assertBulkUpsertSuccess,
  EMPTY_BULK_UPSERT_RESPONSE,
  toBulkUpsertResponseFromBulk,
  toBulkUpsertResponseFromUpdate,
  validateCreateExecutionsDataAccessParams,
  validateCreateWorkflowExecutionsDataAccessParams,
  validateCreateStepExecutionsDataAccessParams,
} from './data_access_layer';
export type {
  ExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
  StepExecutionsDataAccess,
  ExecutionStorageSource,
  ExecutionDataStreamClient,
  ExecutionsSearchRequest,
  ExecutionsCountRequest,
  GetExecutionsByIdsOptions,
  ExecutionSourceProjectionField,
  WorkflowExecutionsSearchRequest,
  StepExecutionsSearchRequest,
  WorkflowExecutionsCountRequest,
  StepExecutionsCountRequest,
  BulkUpsertIndexResolver,
  BulkUpsertRequest,
  BulkUpsertRequestOptions,
  BulkUpsertResponse,
  BulkUpsertItemResponse,
  UpsertDocument,
  WorkflowExecutionUpsertDocument,
  StepExecutionUpsertDocument,
  WorkflowExecutionsBulkUpsertRequest,
  StepExecutionsBulkUpsertRequest,
  CreateExecutionsDataAccessDeps,
  CreateWorkflowExecutionsDataAccessDeps,
  CreateStepExecutionsDataAccessDeps,
  GetStepExecutionsByIdsOptions,
  GetStepExecutionsByWorkflowExecutionParams,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionSourceProjectionField,
  WorkflowExecutionSourceProjectionField,
  PlainIndexExecutionsDataAccessDeps,
} from './data_access_layer';

export type {
  GetManagedWorkflowStatusOptions,
  ManagedWorkflowStatus,
  ManagedWorkflowStatusReport,
} from './types';
