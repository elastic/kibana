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

export interface GetExecutionByIdsItem<TExecution> extends DocumentVersionFields {
  document: TExecution;
}

export interface GetExecutionsByIdsResponse<TExecution> {
  items: GetExecutionByIdsItem<TExecution>[];
  missing: string[];
}

export interface ReadonlyDataClient<TExecution extends { id: string }> {
  /**
   * Searches for execution documents matching the given query.
   * Throws on storage errors (connection failures, query errors, etc.).
   */
  search(request: ExecutionsSearchRequest): Promise<estypes.SearchResponse<TExecution>>;

  /**
   * Returns the count of execution documents matching the given query.
   * Throws on storage errors.
   */
  count(request: ExecutionsCountRequest): Promise<estypes.CountResponse>;

  /**
   * Fetches execution documents by their IDs (real-time, O(1) per doc).
   * Found docs are returned in `items`; IDs with no matching document appear
   * in `missing`. Never throws for missing docs — use `missing` to detect them.
   * Throws on storage errors.
   */
  getByIds(
    ids: string[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>>;
}

export interface WritableDataClient<TExecution extends { id: string }> {
  /**
   * Writes multiple execution documents in a single request (create/update/upsert).
   * Response `items` length and order always match the request (1:1 alignment).
   * Per-document errors are surfaced in `items[i].error` rather than thrown;
   * check `response.errors` to detect any failures.
   * Throws on storage errors.
   */
  bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse>;

  /**
   * Applies a conditional script update to a single execution document by ID.
   * Returns:
   *   - `'updated'`   — script ran and modified the document.
   *   - `'noop'`      — script ran but made no changes (e.g. condition not met).
   *   - `'not_found'` — no document exists for the given ID; no write performed.
   * Throws on storage errors other than not-found.
   */
  scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse>;

  /**
   * Deletes all execution documents matching the given query.
   * Throws on storage errors.
   */
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
  stop: () => Promise<void>;
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
