/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';

/** Backing store for execution documents. */
export type ExecutionStorageSource = 'system_index' | 'data_stream';

/**
 * Data stream client handle for `data_stream` backends.
 * Concrete typing from `@kbn/data-streams` will be wired when that backend lands.
 */
export type ExecutionDataStreamClient = unknown;

/** Search body without index — DAL resolves the target. */
export type ExecutionsSearchRequest = Omit<estypes.SearchRequest, 'index'>;

/** Count body without index — DAL resolves the target. */
export type ExecutionsCountRequest = Omit<estypes.CountRequest, 'index'>;

/** Delete-by-query body without index — DAL resolves the target. */
export type ExecutionsDeleteByQueryRequest = Omit<estypes.DeleteByQueryRequest, 'index'>;

/** Partial document with required id. */
export type UpsertDocument<TDoc extends { id: string }> = Partial<TDoc> & { id: string };

export interface CreateDataClientDeps {
  source: ExecutionStorageSource;
  logger: Logger;
}

export type ExecutionSourceProjectionField<TExecution extends { id: string }> = Extract<
  keyof TExecution,
  string
>;

export interface GetExecutionsByIdsOptions<TExecution extends { id: string }> {
  sourceIncludes?: ExecutionSourceProjectionField<TExecution>[];
  sourceExcludes?: ExecutionSourceProjectionField<TExecution>[];
}

export interface DocumentVersionFields {
  index: string;
  seqNo?: number;
  primaryTerm?: number;
}

export interface GetExecutionByIdsItem<TExecution extends { id: string }>
  extends DocumentVersionFields {
  document: TExecution;
}

export interface GetExecutionsByIdsResponse<TExecution extends { id: string }> {
  items: GetExecutionByIdsItem<TExecution>[];
  missing: string[];
}

export interface ReadonlyDataClient<TExecution extends { id: string }> {
  search(request: ExecutionsSearchRequest): Promise<estypes.SearchResponse<TExecution>>;
  count(request: ExecutionsCountRequest): Promise<estypes.CountResponse>;
  getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>>;
}

export interface WritableDataClient<TExecution extends { id: string }> {
  bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse>;
  scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse>;
  deleteByQuery(request: ExecutionsDeleteByQueryRequest): Promise<estypes.DeleteByQueryResponse>;
}

export type DataClient<TExecution extends { id: string }> = ReadonlyDataClient<TExecution> &
  WritableDataClient<TExecution>;

export type WorkflowExecutionsDataClient = DataClient<EsWorkflowExecution>;
export type StepExecutionsDataClient = DataClient<EsWorkflowStepExecution>;

/** Pair of workflow/step data access instances plus lifecycle hooks from `createDataClientBundle`. */
export interface DataClientBundle {
  initSetup: (coreSetup: CoreSetup) => Promise<void>;
  initStart: (coreStart: CoreStart) => Promise<void>;
  createWorkflowDataClient: () => WorkflowExecutionsDataClient;
  createStepDataClient: () => StepExecutionsDataClient;
}

export type WorkflowExecutionsSearchRequest = ExecutionsSearchRequest;
export type StepExecutionsSearchRequest = ExecutionsSearchRequest;

export type WorkflowExecutionsCountRequest = ExecutionsCountRequest;
export type StepExecutionsCountRequest = ExecutionsCountRequest;

export type WorkflowExecutionsDeleteByQueryRequest = ExecutionsDeleteByQueryRequest;
export type StepExecutionsDeleteByQueryRequest = ExecutionsDeleteByQueryRequest;

export type WorkflowExecutionUpsertDocument = UpsertDocument<EsWorkflowExecution>;
export type StepExecutionUpsertDocument = UpsertDocument<EsWorkflowStepExecution>;

export type WorkflowExecutionSourceProjectionField =
  ExecutionSourceProjectionField<EsWorkflowExecution>;
export type StepExecutionSourceProjectionField =
  ExecutionSourceProjectionField<EsWorkflowStepExecution>;

export type GetWorkflowExecutionsByIdsOptions = GetExecutionsByIdsOptions<EsWorkflowExecution>;
export type GetStepExecutionsByIdsOptions = GetExecutionsByIdsOptions<EsWorkflowStepExecution>;

export interface BulkItem<TDocument extends { id: string }> {
  operation: 'create' | 'update' | 'upsert';
  document: Partial<TDocument> & { id: string };
  seqNo?: number;
  primaryTerm?: number;
  retryOnConflict?: number;
}

export interface BulkRequestOptions<TDocument extends { id: string }> {
  refresh?: boolean | 'wait_for';
  items: BulkItem<TDocument>[];
}

/** Per-document outcome aligned with ES bulk item fields (update/index/create). */
export interface BulkItemResponse extends DocumentVersionFields {
  id: string;
  error?: estypes.ErrorCause;
}

/** Always bulk-shaped: `items.length ===` normalized document count, input order preserved. */
export interface BulkResponse {
  items: BulkItemResponse[];
  errors: boolean;
}

export type ScriptUpdateResult = 'updated' | 'not_found' | 'noop';

export interface ScriptUpdateRequest {
  id: string;
  script: string;
  params: Record<string, unknown>;
  retryOnConflict?: number;
  refresh?: boolean | 'wait_for';
}

export interface ScriptUpdateResponse {
  result: ScriptUpdateResult;
}
