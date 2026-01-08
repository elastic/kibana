/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

export class WorkflowExecutionRepository {
  private indexName = WORKFLOWS_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Retrieves a workflow execution by its ID from Elasticsearch.
   *
   * @param workflowExecutionId - The ID of the workflow execution to retrieve.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @returns A promise that resolves to the workflow execution document, or null if not found.
   */
  public async getWorkflowExecutionById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null> {
    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.indexName,
      query: {
        bool: {
          filter: [{ term: { id: workflowExecutionId } }, { term: { spaceId } }],
        },
      },
      size: 1,
    });
    if (response.hits.hits.length === 0) {
      return null;
    }
    return response.hits.hits[0]._source as EsWorkflowExecution;
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
  ): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for creation');
    }

    await this.esClient.index({
      index: this.indexName,
      id: workflowExecution.id,
      refresh: options.refresh ?? false,
      document: workflowExecution,
    });
  }

  /**
   * Partially updates an existing workflow execution in Elasticsearch.
   *
   * This method requires the `id` property to be present in the `workflowExecution` object.
   * If the `id` is missing, an error is thrown.
   * The update operation is performed using the Elasticsearch client, and the document is refreshed after the update.
   *
   * @param workflowExecution - A partial object representing the workflow execution to update. Must include the `id` property.
   * @throws {Error} If the `id` property is not provided in the `workflowExecution` object.
   * @returns A promise that resolves when the update operation is complete.
   */
  public async updateWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for update');
    }

    await this.esClient.update<Partial<EsWorkflowExecution>>({
      index: this.indexName,
      id: workflowExecution.id,
      refresh: false,
      doc: workflowExecution,
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
    updates: Array<Partial<EsWorkflowExecution>>
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    updates.forEach((update) => {
      if (!update.id) {
        throw new Error('Workflow execution ID is required for bulk update');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: true,
      index: this.indexName,
      body: updates.flatMap((update) => [{ update: { _id: update.id } }, { doc: update }]),
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
   * Retrieves running (non-terminal) workflow executions by workflow ID.
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
    const mustClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
    ];

    if (triggeredBy) {
      mustClauses.push({ term: { triggeredBy } });
    }

    return this.searchWorkflowExecutions(
      {
        bool: {
          must: mustClauses,
          must_not: [
            {
              terms: {
                status: TerminalExecutionStatuses,
              },
            },
          ],
        },
      },
      1
    );
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
    const mustClauses: Array<Record<string, unknown>> = [
      { term: { concurrencyGroupKey } },
      { term: { spaceId } },
    ];

    // Exclude terminal statuses - include PENDING, RUNNING, WAITING, etc.
    const mustNotClauses: Array<Record<string, unknown>> = [
      {
        terms: {
          status: TerminalExecutionStatuses,
        },
      },
    ];

    if (excludeExecutionId) {
      mustNotClauses.push({ term: { id: excludeExecutionId } });
    }

    const response = await this.esClient.search<Pick<EsWorkflowExecution, 'id'>>({
      index: this.indexName,
      query: {
        bool: {
          must: mustClauses,
          must_not: mustNotClauses.length > 0 ? mustNotClauses : undefined,
        },
      },
      _source: ['id'], // Only fetch ID field for efficiency
      sort: [{ createdAt: { order: 'asc' } }], // Oldest first
      size: Math.min(size, 10000), // Cap at ES default max_result_window for validation
    });

    return response.hits.hits
      .map((hit) => hit._source?.id ?? hit._id)
      .filter((id): id is string => id !== undefined);
  }
}
