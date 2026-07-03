/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import {
  ConcurrencySlotOccupyingExecutionStatuses,
  ExecutionStatus,
  NonTerminalExecutionStatuses,
  WORKFLOWS_EXECUTIONS_DS,
} from '@kbn/workflows';
import { bulkUpdateDocuments, resolveVersions } from './bulk_update_documents';
import type { DocumentVersionsById, EsDocumentVersion } from './document_version';
import { getDocumentsById } from './get_doc_by_id';
import { resolveWriteIndex } from './resolve_write_index';
import type { WorkflowExecutionsDataStreamClient } from './workflow_executions_data_stream';

export class WorkflowExecutionRepository {
  private dataStreamName = WORKFLOWS_EXECUTIONS_DS;

  constructor(
    private esClient: ElasticsearchClient,
    private dataStreamClient: WorkflowExecutionsDataStreamClient
  ) {}

  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'meta' in error &&
      (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
    );
  }

  /**
   * Retrieves a workflow execution by its ID from Elasticsearch.
   *
   * Uses direct document GET by _id for O(1) lookup performance instead of search.
   * This is critical for high-frequency operations like cancel polling.
   *
   * @param workflowExecutionId - The ID of the workflow execution to retrieve.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @returns A promise that resolves to the workflow execution document, or null if not found.
   */
  public async getWorkflowExecutionById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null> {
    try {
      const writeIndex = await resolveWriteIndex({
        esClient: this.esClient,
        dataStreamName: this.dataStreamName,
      });
      const docs = await getDocumentsById<EsWorkflowExecution>({
        esClient: this.esClient,
        ids: [workflowExecutionId],
        writeIndex,
        dataStreamName: this.dataStreamName,
        entityName: 'workflow execution',
      });
      const hits = docs.map(({ doc }) => doc).filter((doc) => doc.spaceId === spaceId);
      if (hits.length === 0) {
        return null;
      }
      return hits[0];
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Like {@link getWorkflowExecutionById} but also returns the document's OCC
   * version metadata. Used to seed the in-memory version cache on load so
   * subsequent updates can skip the version lookup.
   */
  public async getWorkflowExecutionWithVersion(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<{ doc: EsWorkflowExecution; version: EsDocumentVersion } | null> {
    try {
      const writeIndex = await resolveWriteIndex({
        esClient: this.esClient,
        dataStreamName: this.dataStreamName,
      });
      const docs = await getDocumentsById<EsWorkflowExecution>({
        esClient: this.esClient,
        ids: [workflowExecutionId],
        writeIndex,
        dataStreamName: this.dataStreamName,
        entityName: 'workflow execution',
      });
      const hit = docs.find(({ doc }) => doc.spaceId === spaceId);
      return hit ? { doc: hit.doc, version: hit.version } : null;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private withTimestamp(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Partial<EsWorkflowExecution> {
    const timestamp = workflowExecution.createdAt ?? new Date().toISOString();
    return {
      ...workflowExecution,
      '@timestamp': timestamp,
    };
  }

  /**
   * Creates a new workflow execution document in Elasticsearch.
   *
   * @param workflowExecution - A partial object representing the workflow execution to be created.
   * @param options - Optional settings for the create operation.
   * @param options.refresh - Whether to refresh the index after writing. Use 'wait_for' when
   *                          immediate searchability is required (e.g., for deduplication checks).
   *                          Defaults to false for better performance.
   * @returns A promise that resolves when the workflow execution has been indexed.
   */
  public async createWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>,
    options: { refresh?: boolean | 'wait_for' } = {}
  ): Promise<Partial<EsWorkflowExecution>> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for creation');
    }

    const doc = this.withTimestamp(workflowExecution);

    await this.dataStreamClient.create({
      // The data stream client's document type is derived structurally from the
      // (cast) index mappings and does not line up with the richer domain type
      // `EsWorkflowExecution`; bridge it the same way the mappings are bridged.
      documents: [{ _id: workflowExecution.id, ...doc }] as Array<{ _id: string }>,
    });

    return doc;
  }

  /**
   * Bulk creates multiple workflow execution documents in a single Elasticsearch request.
   * Per-doc errors are reported per item in input order instead of throwing.
   *
   * @param executions - Array of partial workflow execution objects. Each must include the `id` property.
   * @param options.refresh - Same semantics as `createWorkflowExecution`.
   * @throws {Error} If any execution ID is missing.
   * @returns Per-item results in the same order as `executions`.
   */
  public async bulkCreateWorkflowExecutions(
    executions: Array<Partial<EsWorkflowExecution>>,
    options: { refresh?: boolean | 'wait_for' } = {}
  ): Promise<
    Array<{ id: string; result: Partial<EsWorkflowExecution> } | { id: string; error: string }>
  > {
    if (executions.length === 0) {
      return [];
    }

    executions.forEach((execution) => {
      if (!execution.id) {
        throw new Error('Workflow execution ID is required for bulk create');
      }
    });

    const docs = executions.map((execution) => this.withTimestamp(execution));

    const bulkResponse = await this.dataStreamClient.create({
      documents: docs.map((doc) => ({ _id: doc.id, ...doc })) as Array<{ _id: string }>,
      refresh: options.refresh ?? false,
    });

    return bulkResponse.items.map((item, idx) => {
      const op = item.create ?? item.index;
      const id = executions[idx].id as string;
      if (op?.error) {
        return { id, error: op.error.reason ?? JSON.stringify(op.error) };
      }
      return {
        id,
        result: docs[idx],
      };
    });
  }

  /**
   * Partially updates an existing workflow execution in Elasticsearch.
   *
   * This method requires the `id` property to be present in the `workflowExecution` object.
   * If the `id` is missing, an error is thrown.
   * The update operation is performed using the Elasticsearch client with refresh: false for better performance.
   * The document will be searchable after the next index refresh (typically within 1 second).
   *
   * @param workflowExecution - A partial object representing the workflow execution to update. Must include the `id` property.
   * @throws {Error} If the `id` property is not provided in the `workflowExecution` object.
   * @returns A promise that resolves when the update operation is complete.
   */
  public async updateWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>,
    options: { refresh?: boolean | 'wait_for' } = {},
    providedVersions?: DocumentVersionsById
  ): Promise<DocumentVersionsById> {
    const id = workflowExecution.id;
    return bulkUpdateDocuments<Partial<EsWorkflowExecution>>({
      esClient: this.esClient,
      dataStreamName: this.dataStreamName,
      writes: [
        {
          doc: workflowExecution,
          version: id ? providedVersions?.[id] : undefined,
        },
      ],
      entityName: 'workflow execution',
      refresh: options.refresh ?? false,
      idRequiredMessage: 'Workflow execution ID is required for update',
    });
  }

  /**
   * Bulk updates multiple workflow executions in a single Elasticsearch request.
   * This is more efficient than individual updates, especially when cancelling multiple executions.
   *
   * @param updates - Array of partial workflow execution objects. Each must include the `id` property.
   * @throws {Error} If any execution ID is missing or if the bulk operation has errors.
   * @returns A promise that resolves when all updates are complete.
   */
  public async bulkUpdateWorkflowExecutions(
    executions: Array<Partial<EsWorkflowExecution>>,
    providedVersions?: DocumentVersionsById
  ): Promise<DocumentVersionsById> {
    return bulkUpdateDocuments<Partial<EsWorkflowExecution>>({
      esClient: this.esClient,
      dataStreamName: this.dataStreamName,
      writes: executions.map((doc) => ({
        doc,
        version: doc.id ? providedVersions?.[doc.id] : undefined,
      })),
      entityName: 'workflow execution',
      refresh: true,
      idRequiredMessage: 'Workflow execution ID is required for bulk update',
    });
  }

  /**
   * Generic method to search workflow executions with a custom query.
   *
   * @param query - The Elasticsearch query object.
   * @param size - Optional maximum number of results to return (default: 10).
   * @returns A promise that resolves to the list of search hits.
   */
  public async searchWorkflowExecutions(query: Record<string, unknown>, size: number = 10) {
    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.dataStreamName,
      query,
      size,
    });

    return response.hits.hits;
  }

  /**
   * Checks if there are any running (non-terminal) workflow executions for a workflow ID.
   *
   * Optimized query using:
   * - filter context (no scoring) instead of must (faster)
   * - direct status match instead of must_not exclusion (more efficient)
   * - terminate_after: 1 to stop scanning after finding one match
   * - size: 0 to avoid fetching document source
   * - _source: false to avoid fetching any document content
   *
   * @param workflowId - The ID of the workflow.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @param triggeredBy - Optional filter for the trigger type (e.g., 'scheduled').
   * @returns A promise that resolves to true if there's a running execution, false otherwise.
   */
  public async hasRunningExecution(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ): Promise<boolean> {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      {
        terms: {
          status: NonTerminalExecutionStatuses,
        },
      },
    ];

    if (triggeredBy) {
      filterClauses.push({ term: { triggeredBy } });
    }

    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.dataStreamName,
      size: 0,
      terminate_after: 1,
      track_total_hits: true,
      _source: false,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
    });

    const total = response.hits.total;
    if (total === undefined) {
      return false;
    }
    return typeof total === 'number' ? total > 0 : total.value > 0;
  }

  /**
   * Retrieves running (non-terminal) workflow executions by workflow ID.
   *
   * Uses the same optimized query structure as hasRunningExecution() but returns the actual hits.
   *
   * @param workflowId - The ID of the workflow.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @param triggeredBy - Optional filter for the trigger type (e.g., 'scheduled').
   * @returns A promise that resolves to the list of search hits for running executions.
   */
  public async getRunningExecutionsByWorkflowId(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ) {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      {
        terms: {
          status: NonTerminalExecutionStatuses,
        },
      },
    ];

    if (triggeredBy) {
      filterClauses.push({ term: { triggeredBy } });
    }

    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.dataStreamName,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
    });

    return response.hits.hits;
  }

  /**
   * Retrieves concurrency-slot IDs by concurrency group key (excludes persisted `queued` backlog).
   * Cancel-in-progress and drop strategies only consider executions that occupy a concurrency slot.
   *
   * Only returns execution IDs (not full documents) for efficiency, as we only need IDs for cancellation.
   * Results are sorted by createdAt ascending (oldest first).
   *
   * @param concurrencyGroupKey - The concurrency group key to filter by.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @param excludeExecutionId - Optional execution ID to exclude from results (e.g., current execution).
   * @param size - Optional limit on the number of results to return. Defaults to 5000.
   * @returns A promise that resolves to an array of execution IDs sorted by createdAt (oldest first).
   */
  public async getRunningExecutionsByConcurrencyGroup(
    concurrencyGroupKey: string,
    spaceId: string,
    excludeExecutionId?: string,
    size: number = 5000
  ): Promise<string[]> {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { concurrencyGroupKey } },
      { term: { spaceId } },
      {
        terms: {
          status: ConcurrencySlotOccupyingExecutionStatuses,
        },
      },
    ];

    if (excludeExecutionId) {
      filterClauses.push({
        bool: {
          must_not: [{ term: { id: excludeExecutionId } }],
        },
      });
    }

    const response = await this.esClient.search<Pick<EsWorkflowExecution, 'id'>>({
      index: this.dataStreamName,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
      _source: ['id'], // Only fetch ID field for efficiency
      sort: [
        { createdAt: { order: 'asc' } },
        { id: { order: 'asc' } }, // Tie-break for determinism when createdAt collides; not chronological order
      ],
      size: Math.min(size, 10000), // Cap at ES default max_result_window for validation
    });

    return response.hits.hits
      .map((hit) => hit._source?.id ?? hit._id)
      .filter((id): id is string => id !== undefined);
  }

  /**
   * Counts workflow executions in a concurrency group constrained to explicit statuses (filter context).
   */
  public async countExecutionsByConcurrencyGroupAndStatuses(
    concurrencyGroupKey: string,
    spaceId: string,
    statuses: readonly ExecutionStatus[],
    excludeExecutionId?: string
  ): Promise<number> {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { concurrencyGroupKey } },
      { term: { spaceId } },
      { terms: { status: statuses } },
    ];
    if (excludeExecutionId) {
      filterClauses.push({
        bool: {
          must_not: [{ term: { id: excludeExecutionId } }],
        },
      });
    }
    const response = await this.esClient.count({
      index: this.dataStreamName,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
    });

    return response.count;
  }

  /**
   * Oldest queued execution id for FIFO promotion (FIFO by createdAt ascending).
   */
  public async getOldestQueuedExecutionIdByConcurrencyGroup(
    concurrencyGroupKey: string,
    spaceId: string
  ): Promise<string | null> {
    const response = await this.esClient.search<Pick<EsWorkflowExecution, 'id'>>({
      index: this.dataStreamName,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { concurrencyGroupKey } },
            { term: { spaceId } },
            { term: { status: ExecutionStatus.QUEUED } },
          ],
        },
      },
      _source: ['id'],
      sort: [{ createdAt: { order: 'asc' } }, { id: { order: 'asc' } }],
    });
    const hit = response.hits.hits[0];
    const id = hit?._source?.id ?? hit?._id;
    return typeof id === 'string' ? id : null;
  }

  /**
   * CAS: promoted `queued` → `pending` only when the document still carries `queued` status.
   */
  public async tryCasPromoteQueuedWorkflowExecutionToPending(params: {
    workflowExecutionId: string;
    spaceId: string;
  }): Promise<boolean> {
    const versions = await resolveVersions({
      esClient: this.esClient,
      dataStreamName: this.dataStreamName,
      entityName: 'workflow execution',
      ids: [params.workflowExecutionId],
    });

    if (params.workflowExecutionId in versions) {
      const version = versions[params.workflowExecutionId];
      const response = await this.esClient.update({
        index: version.index,
        id: params.workflowExecutionId,
        if_seq_no: version.seqNo,
        if_primary_term: version.primaryTerm,
        // Near-real-time search must see this doc as PENDING before the next
        // drain loop iteration counts slot occupancy; otherwise max:1 can double-promote.
        refresh: 'wait_for',
        script: {
          lang: 'painless',
          source: `
            if (ctx._source.status == params.queuedStatus && ctx._source.spaceId == params.spaceId) {
              ctx._source.status = params.pendingStatus;
            } else {
              ctx.op = 'noop';
            }
          `,
          params: {
            queuedStatus: ExecutionStatus.QUEUED,
            pendingStatus: ExecutionStatus.PENDING,
            spaceId: params.spaceId,
          },
        },
      });
      return response.result === 'updated';
    }

    return false;
  }

  /**
   * One page of non-terminal workflow execution IDs for a workflow in a space, using
   * search_after on the executions index (no point-in-time). Callers page by passing
   * nextSearchAfter from the previous response. Under concurrent index changes, pagination
   * is not a strict snapshot (possible duplicates or gaps across pages).
   */
  public async findNonTerminalExecutionIdsByWorkflowIdPage({
    spaceId,
    workflowId,
    size,
    searchAfter,
  }: {
    spaceId: string;
    workflowId: string;
    size: number;
    searchAfter?: estypes.SortResults;
  }): Promise<{
    results: string[];
    total: number;
    nextSearchAfter?: estypes.SortResults;
  }> {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      {
        terms: {
          status: NonTerminalExecutionStatuses,
        },
      },
    ];

    const pageSize = Math.min(size, 10000);

    const response = await this.esClient.search<Pick<EsWorkflowExecution, 'id'>>({
      index: this.dataStreamName,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
      _source: ['id'],
      sort: [{ createdAt: { order: 'asc' } }, { id: { order: 'asc' } }],
      size: pageSize,
      track_total_hits: true,
      ...(searchAfter?.length ? { search_after: searchAfter } : {}),
    });

    const hits = response.hits.hits;
    const results = hits
      .map((hit) => hit._source?.id ?? hit._id)
      .filter((id): id is string => id !== undefined);

    const rawTotal = response.hits.total;
    const total = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value ?? 0;

    let nextSearchAfter: estypes.SortResults | undefined;
    if (results.length === pageSize && hits.length > 0) {
      const lastSort = hits[hits.length - 1]?.sort;
      if (lastSort) {
        nextSearchAfter = lastSort;
      }
    }

    return { results, total, nextSearchAfter };
  }
}
