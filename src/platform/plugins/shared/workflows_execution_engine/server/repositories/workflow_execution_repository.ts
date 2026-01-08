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
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

export class WorkflowExecutionRepository {
  private indexName = WORKFLOWS_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

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
      const response = await this.esClient.get<EsWorkflowExecution>({
        index: this.indexName,
        id: workflowExecutionId,
      });

      const doc = response._source;
      // Verify spaceId matches for security/multi-tenancy
      if (!doc || doc.spaceId !== spaceId) {
        return null;
      }
      return doc;
    } catch (error: unknown) {
      // Handle 404 - document not found
      if (
        error instanceof Error &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
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
      // Direct match on in-progress statuses is faster than must_not on terminal statuses
      {
        terms: {
          status: [
            ExecutionStatus.PENDING,
            ExecutionStatus.WAITING,
            ExecutionStatus.WAITING_FOR_INPUT,
            ExecutionStatus.RUNNING,
          ],
        },
      },
    ];

    if (triggeredBy) {
      filterClauses.push({ term: { triggeredBy } });
    }

    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.indexName,
      size: 0, // Don't need the document, just checking existence
      terminate_after: 1, // Stop after finding 1 match
      track_total_hits: true,
      query: {
        bool: {
          filter: filterClauses, // Filter context = no scoring = faster
        },
      },
    });

    const total = response.hits.total;
    return typeof total === 'number' ? total > 0 : total.value > 0;
  }

  /**
   * Retrieves running (non-terminal) workflow executions by workflow ID.
   *
   * @param workflowId - The ID of the workflow.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @param triggeredBy - Optional filter for the trigger type (e.g., 'scheduled').
   * @returns A promise that resolves to the list of search hits for running executions.
   * @deprecated Use hasRunningExecution() for overlap checks - it's more efficient.
   */
  public async getRunningExecutionsByWorkflowId(
    workflowId: string,
    spaceId: string,
    triggeredBy?: string
  ) {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      // Direct match on in-progress statuses is faster than must_not on terminal statuses
      {
        terms: {
          status: [
            ExecutionStatus.PENDING,
            ExecutionStatus.WAITING,
            ExecutionStatus.WAITING_FOR_INPUT,
            ExecutionStatus.RUNNING,
          ],
        },
      },
    ];

    if (triggeredBy) {
      filterClauses.push({ term: { triggeredBy } });
    }

    const response = await this.esClient.search<EsWorkflowExecution>({
      index: this.indexName,
      size: 1,
      terminate_after: 1, // Stop after finding 1 match
      query: {
        bool: {
          filter: filterClauses, // Filter context = no scoring = faster
        },
      },
    });

    return response.hits.hits;
  }
}
