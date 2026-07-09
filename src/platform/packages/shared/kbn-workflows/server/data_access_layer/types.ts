/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '../../types/v1';

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

/** Partial document with required id — same for single- and multi-document upserts. */
export type UpsertDocument<TDoc extends { id: string }> = Partial<TDoc> & { id: string };

/** Bulk-level options from ES Bulk API (index/operations omitted — DAL builds those). */
export type BulkUpsertRequestOptions = Pick<
  estypes.BulkRequest,
  'refresh' | 'pipeline' | 'require_alias' | 'wait_for_active_shards'
>;

/** Unified upsert request: one or many documents, same contract. */
export type BulkUpsertRequest<TDoc extends { id: string }> = BulkUpsertRequestOptions & {
  documents:
    | UpsertDocument<Partial<TDoc> & { id: string }>
    | UpsertDocument<Partial<TDoc> & { id: string }>[];
};

/** Bulk ES `create` request (fails on existing id; does not upsert). */
export type BulkCreateRequest<TDoc extends { id: string }> = BulkUpsertRequestOptions & {
  documents:
    | UpsertDocument<Partial<TDoc> & { id: string }>
    | UpsertDocument<Partial<TDoc> & { id: string }>[];
};

/** Bulk ES `update` request (partial doc merge; no doc_as_upsert). */
export type BulkUpdateRequest<TDoc extends { id: string }> = BulkUpsertRequestOptions & {
  documents:
    | UpsertDocument<Partial<TDoc> & { id: string }>
    | UpsertDocument<Partial<TDoc> & { id: string }>[];
};

/** Static index name or per-document resolver for multi-index bulk upserts. */
export type BulkUpsertIndexResolver<TDoc extends { id: string }> =
  | string
  | ((document: UpsertDocument<TDoc>) => string);

/** Per-document outcome aligned with ES bulk item fields (update/index/create). */
export interface BulkUpsertItemResponse {
  id: string;
  status: number;
  result?: estypes.Result;
  error?: estypes.ErrorCause;
  _shards?: estypes.ShardStatistics;
  _seq_no?: number;
  _primary_term?: number;
  _version?: estypes.VersionNumber;
}

/** Always bulk-shaped: `items.length ===` normalized document count, input order preserved. */
export type BulkUpsertResponse = Pick<estypes.BulkResponse, 'took' | 'errors' | 'ingest_took'> & {
  items: BulkUpsertItemResponse[];
};

export interface CreateExecutionsDataAccessDeps {
  source: ExecutionStorageSource;
  esClient: ElasticsearchClient;
  /** Required when source is `data_stream`; ignored for index-backed sources. */
  dataStreamClient?: ExecutionDataStreamClient;
  logger?: Logger;
}

/** @deprecated Use {@link CreateExecutionsDataAccessDeps} */
export type CreateWorkflowExecutionsDataAccessDeps = CreateExecutionsDataAccessDeps;

/** @deprecated Use {@link CreateExecutionsDataAccessDeps} */
export type CreateStepExecutionsDataAccessDeps = CreateExecutionsDataAccessDeps;

export type ExecutionSourceProjectionField<TExecution extends { id: string }> = Extract<
  keyof TExecution,
  string
>;

export interface GetExecutionsByIdsOptions<TExecution extends { id: string }> {
  sourceIncludes?: ExecutionSourceProjectionField<TExecution>[];
  sourceExcludes?: ExecutionSourceProjectionField<TExecution>[];
}

export interface ReadonlyExecutionsDataAccess<TExecution extends { id: string }> {
  search(request: ExecutionsSearchRequest): Promise<estypes.SearchResponse<TExecution>>;
  count(request: ExecutionsCountRequest): Promise<estypes.CountResponse>;
  getByIds(ids: string[], options?: GetExecutionsByIdsOptions<TExecution>): Promise<TExecution[]>;
}

export interface WritableExecutionsDataAccess<TExecution extends { id: string }> {
  bulkUpsert(request: BulkUpsertRequest<TExecution & { id: string }>): Promise<BulkUpsertResponse>;
  bulkCreate(request: BulkCreateRequest<TExecution & { id: string }>): Promise<BulkUpsertResponse>;
  bulkUpdate(request: BulkUpdateRequest<TExecution & { id: string }>): Promise<BulkUpsertResponse>;
  deleteByQuery(request: ExecutionsDeleteByQueryRequest): Promise<estypes.DeleteByQueryResponse>;
}

export type ExecutionsDataAccess<TExecution extends { id: string }> =
  ReadonlyExecutionsDataAccess<TExecution> & WritableExecutionsDataAccess<TExecution>;

export type WorkflowExecutionsDataAccess = ExecutionsDataAccess<EsWorkflowExecution>;
export type StepExecutionsDataAccess = ExecutionsDataAccess<EsWorkflowStepExecution>;

export type WorkflowExecutionsSearchRequest = ExecutionsSearchRequest;
export type StepExecutionsSearchRequest = ExecutionsSearchRequest;

export type WorkflowExecutionsCountRequest = ExecutionsCountRequest;
export type StepExecutionsCountRequest = ExecutionsCountRequest;

export type WorkflowExecutionsDeleteByQueryRequest = ExecutionsDeleteByQueryRequest;
export type StepExecutionsDeleteByQueryRequest = ExecutionsDeleteByQueryRequest;

export type WorkflowExecutionUpsertDocument = UpsertDocument<EsWorkflowExecution>;
export type StepExecutionUpsertDocument = UpsertDocument<EsWorkflowStepExecution>;

export type WorkflowExecutionsBulkUpsertRequest = BulkUpsertRequest<EsWorkflowExecution>;
export type StepExecutionsBulkUpsertRequest = BulkUpsertRequest<EsWorkflowStepExecution>;

export type WorkflowExecutionsBulkCreateRequest = BulkCreateRequest<EsWorkflowExecution>;
export type StepExecutionsBulkCreateRequest = BulkCreateRequest<EsWorkflowStepExecution>;

export type WorkflowExecutionsBulkUpdateRequest = BulkUpdateRequest<EsWorkflowExecution>;
export type StepExecutionsBulkUpdateRequest = BulkUpdateRequest<EsWorkflowStepExecution>;

export type WorkflowExecutionSourceProjectionField =
  ExecutionSourceProjectionField<EsWorkflowExecution>;
export type StepExecutionSourceProjectionField =
  ExecutionSourceProjectionField<EsWorkflowStepExecution>;

export type GetWorkflowExecutionsByIdsOptions = GetExecutionsByIdsOptions<EsWorkflowExecution>;
export type GetStepExecutionsByIdsOptions = GetExecutionsByIdsOptions<EsWorkflowStepExecution>;
