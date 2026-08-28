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

export {
  createOrUpdateIndex,
  createIndexWithMappings,
} from './implementations/plain_index/helpers/create_index';

export { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from './mappings/workflow_executions_mappings';
export { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from './mappings/step_executions_mappings';

export { createUnsupportedStorageSourceError } from './lib/unsupported_storage_source';
export { getStepExecutionsByWorkflowExecution } from './lib/get_step_executions_by_workflow_execution';
export type { GetStepExecutionsByWorkflowExecutionParams } from './lib/get_step_executions_by_workflow_execution';

export type { DataClient, WorkflowExecutionsDataClient, StepExecutionsDataClient } from './types';
export type { PlainIndexDataClientDeps } from './implementations/plain_index/plain_index_data_client';
export { PlainIndexDataClient } from './implementations/plain_index/plain_index_data_client';
export { createDataClientBundle } from './implementations/create_data_client_bundle';

export type {
  BulkItem,
  BulkItemResponse,
  BulkRequestOptions,
  BulkResponse,
  CreateDataClientDeps,
  ExecutionSourceProjectionField,
  ExecutionStorageSource,
  DataClientBundle,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  DocumentVersionFields,
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  GetStepExecutionsByIdsOptions,
  GetWorkflowExecutionsByIdsOptions,
  StepExecutionSourceProjectionField,
  StepExecutionUpsertDocument,
  StepExecutionsCountRequest,
  StepExecutionsDeleteByQueryRequest,
  StepExecutionsSearchRequest,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
  ScriptUpdateResult,
  UpsertDocument,
  WorkflowExecutionSourceProjectionField,
  WorkflowExecutionUpsertDocument,
  WorkflowExecutionsCountRequest,
  WorkflowExecutionsDeleteByQueryRequest,
  WorkflowExecutionsSearchRequest,
} from './types';
