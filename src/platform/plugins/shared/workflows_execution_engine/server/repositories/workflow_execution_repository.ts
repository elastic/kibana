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
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { DocumentLocatorsById, DocumentUpdate, LocatedDocument } from './document_version';
import { getEsDocumentLocator } from './document_version';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

const RECENT_BACKING_INDEX_LOOKUP_COUNT = 3;

export class WorkflowExecutionRepository {
  private indexName = WORKFLOWS_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  public async resolveWriteIndex(): Promise<string> {
    const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
      name: this.indexName,
    });

    const writeIndex = dataStreams[0]?.indices.at(-1)?.index_name;
    if (!writeIndex) {
      throw new Error(`No write backing index found for data stream ${this.indexName}`);
    }
    return writeIndex;
  }

  private async getRecentBackingIndices(): Promise<string[]> {
    const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
      name: this.indexName,
    });
    return (
      dataStreams[0]?.indices
        .map((index) => index.index_name)
        .filter((indexName): indexName is string => Boolean(indexName))
        .slice(-RECENT_BACKING_INDEX_LOOKUP_COUNT)
        .reverse() ?? []
    );
  }

  private locatedDocumentFromHit(hit: {
    _index?: string;
    _source?: EsWorkflowExecution;
    _seq_no?: number;
    _primary_term?: number;
  }): LocatedDocument<EsWorkflowExecution> | null {
    if (!hit._source) {
      return null;
    }
    return {
      doc: hit._source,
      locator: getEsDocumentLocator({
        index: hit._index,
        seqNo: hit._seq_no,
        primaryTerm: hit._primary_term,
      }),
    };
  }

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
    const result = await this.getWorkflowExecutionWithLocatorById(workflowExecutionId, spaceId);
    return result?.doc ?? null;
  }

  public async getWorkflowExecutionWithLocatorById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<LocatedDocument<EsWorkflowExecution> | null> {
    try {
      const recentBackingIndices = await this.getRecentBackingIndices();
      if (recentBackingIndices.length > 0) {
        const response = await this.esClient.mget<EsWorkflowExecution>({
          docs: recentBackingIndices.map((index) => ({
            _index: index,
            _id: workflowExecutionId,
          })),
        });
        const hits = response.docs
          .map((doc) =>
            'found' in doc && doc.found
              ? this.locatedDocumentFromHit(doc as estypes.GetGetResult<EsWorkflowExecution>)
              : null
          )
          .filter((doc): doc is LocatedDocument<EsWorkflowExecution> => doc !== null)
          .filter((doc) => doc.doc.spaceId === spaceId);
        if (hits.length === 1) {
          return hits[0];
        }
      }

      const searchResponse = await this.esClient.search<EsWorkflowExecution>({
        index: this.indexName,
        seq_no_primary_term: true,
        query: {
          ids: {
            values: [workflowExecutionId],
          },
        },
        size: 2,
      });
      const hits = searchResponse.hits.hits
        .map((hit) => this.locatedDocumentFromHit(hit))
        .filter((doc): doc is LocatedDocument<EsWorkflowExecution> => doc !== null)
        .filter((doc) => doc.doc.spaceId === spaceId);
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
  ): Promise<LocatedDocument<Partial<EsWorkflowExecution>>> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for creation');
    }

    const doc = this.withTimestamp(workflowExecution);
    const response = await this.esClient.create<Partial<EsWorkflowExecution>>({
      index: this.indexName,
      id: workflowExecution.id,
      refresh: options.refresh ?? false,
      document: doc,
    });

    return {
      doc,
      locator: getEsDocumentLocator({
        index: response._index,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      }),
    };
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
    Array<
      | { id: string; result: LocatedDocument<Partial<EsWorkflowExecution>> }
      | { id: string; error: string }
    >
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
    const bulkResponse = await this.esClient.bulk({
      refresh: options.refresh ?? false,
      index: this.indexName,
      operations: docs.flatMap((doc) => [{ create: { _id: doc.id } }, doc]),
    });

    return bulkResponse.items.map((item, idx) => {
      const op = item.create ?? item.index;
      const id = executions[idx].id as string;
      if (op?.error) {
        return { id, error: op.error.reason ?? JSON.stringify(op.error) };
      }
      return {
        id,
        result: {
          doc: docs[idx],
          locator: getEsDocumentLocator({
            index: op?._index,
            seqNo: op?._seq_no,
            primaryTerm: op?._primary_term,
          }),
        },
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
  public async updateWorkflowExecution({
    doc: workflowExecution,
    locator,
  }: DocumentUpdate<Partial<EsWorkflowExecution>>): Promise<DocumentLocatorsById> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for update');
    }

    const response = await this.esClient.update<Partial<EsWorkflowExecution>>({
      index: locator.index,
      id: workflowExecution.id,
      refresh: false,
      doc: workflowExecution,
      if_seq_no: locator.seqNo,
      if_primary_term: locator.primaryTerm,
    });
    return {
      [workflowExecution.id]: getEsDocumentLocator({
        index: response._index,
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      }),
    };
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
    writes: Array<DocumentUpdate<Partial<EsWorkflowExecution>>>
  ): Promise<DocumentLocatorsById> {
    if (writes.length === 0) {
      return {};
    }

    const operations = writes.flatMap(({ doc: update, locator }) => {
      if (!update.id) {
        throw new Error('Workflow execution ID is required for bulk update');
      }

      return [
        {
          update: {
            _index: locator.index,
            _id: update.id,
            if_seq_no: locator.seqNo,
            if_primary_term: locator.primaryTerm,
          },
        },
        { doc: update },
      ];
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: true,
      operations,
    });

    if (bulkResponse.errors) {
      const erroredDocuments = bulkResponse.items
        .filter((item) => item.update?.error)
        .map((item) => ({
          id: item.update?._id,
          error: item.update?.error,
          status: item.update?.status,
        }));

      throw new Error(
        `Failed to update ${erroredDocuments.length} workflow executions: ${JSON.stringify(
          erroredDocuments
        )}`
      );
    }

    const locators: DocumentLocatorsById = {};
    bulkResponse.items.forEach((item) => {
      const op = item.update;
      if (op?._id && !op.error) {
        locators[op._id] = getEsDocumentLocator({
          index: op._index,
          seqNo: op._seq_no,
          primaryTerm: op._primary_term,
        });
      }
    });
    return locators;
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
      index: this.indexName,
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
      index: this.indexName,
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
      index: this.indexName,
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
   * Retrieves non-terminal workflow execution IDs by concurrency group key.
   * For cancel-in-progress strategy, we need to cancel any non-terminal executions (PENDING, RUNNING, etc.)
   * to make room for new executions.
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
          status: NonTerminalExecutionStatuses,
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
      index: this.indexName,
      query: {
        bool: {
          filter: filterClauses,
        },
      },
      _source: ['id'],
      sort: [{ createdAt: { order: 'asc' } }],
      size: Math.min(size, 10000),
    });

    return response.hits.hits
      .map((hit) => hit._source?.id ?? hit._id)
      .filter((id): id is string => id !== undefined);
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
      index: this.indexName,
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
