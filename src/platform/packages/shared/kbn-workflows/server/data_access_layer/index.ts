/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from './constants/execution_indexes';

export { createOrUpdateIndex, createIndexWithMappings } from './init/create_or_update_index';

export { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from './mappings/workflow_executions_mappings';
export { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from './mappings/step_executions_mappings';
export { TOKEN_USAGE_MAPPING } from './mappings/token_usage_mapping';

export { executeIndexBulkUpsert } from './implementations/plain_index/execute_index_bulk_upsert';
export {
  EMPTY_BULK_UPSERT_RESPONSE,
  assertBulkUpsertSuccess,
  throwBulkUpsertError,
} from './lib/bulk_upsert_error';
export {
  toBulkUpsertResponseFromBulk,
  toBulkUpsertResponseFromUpdate,
} from './lib/bulk_upsert_response';
export {
  assertUpsertDocumentsHaveIds,
  normalizeUpsertDocuments,
} from './lib/normalize_upsert_documents';
export {
  createUnsupportedStorageSourceError,
  validateCreateExecutionsDataAccessParams,
  validateCreateStepExecutionsDataAccessParams,
  validateCreateWorkflowExecutionsDataAccessParams,
} from './lib/validate_factory_params';
export { getStepExecutionsByWorkflowExecution } from './lib/get_step_executions_by_workflow_execution';
export type { GetStepExecutionsByWorkflowExecutionParams } from './lib/get_step_executions_by_workflow_execution';

export type {
  ExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
  StepExecutionsDataAccess,
} from './types';
export type { PlainIndexExecutionsDataAccessDeps } from './implementations/plain_index/plain_index_executions_data_access';
export { PlainIndexExecutionsDataAccess } from './implementations/plain_index/plain_index_executions_data_access';
export { normalizeStepExecutionOnGet } from './implementations/plain_index/normalize_step_execution_on_get';
export {
  createExecutionsDal,
  createStepExecutionsDataAccess,
  createWorkflowExecutionsDataAccess,
} from './implementations/create_executions_dal';

export type {
  BulkUpsertIndexResolver,
  BulkUpsertItemResponse,
  BulkUpsertRequest,
  BulkUpsertRequestOptions,
  BulkUpsertResponse,
  CreateExecutionsDataAccessDeps,
  CreateStepExecutionsDataAccessDeps,
  CreateWorkflowExecutionsDataAccessDeps,
  ExecutionDataStreamClient,
  ExecutionSourceProjectionField,
  ExecutionStorageSource,
  ExecutionsCountRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionSourceProjectionField,
  StepExecutionUpsertDocument,
  StepExecutionsBulkUpsertRequest,
  StepExecutionsCountRequest,
  StepExecutionsSearchRequest,
  UpsertDocument,
  WorkflowExecutionSourceProjectionField,
  WorkflowExecutionUpsertDocument,
  WorkflowExecutionsBulkUpsertRequest,
  WorkflowExecutionsCountRequest,
  WorkflowExecutionsSearchRequest,
} from './types';
