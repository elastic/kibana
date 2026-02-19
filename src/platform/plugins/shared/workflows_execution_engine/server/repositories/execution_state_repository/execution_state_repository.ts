/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type EsExecution,
  NonTerminalExecutionStatuses,
  TerminalExecutionStatuses,
} from '@kbn/workflows';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../../common';

export interface FindExecutionsOptions {
  executionIds?: Set<string>;
  type?: 'workflow' | 'step';
}

export class ExecutionStateRepository {
  private indexName = WORKFLOWS_EXECUTION_STATE_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Searches for step executions by workflow execution ID.
   *
   * @param executionId - The ID of the workflow execution to search for step executions.
   * @returns A promise that resolves to an array of step executions associated with the given execution ID.
   */
  public async getExecutions(
    executionIds: Set<string>,
    spaceId: string
  ): Promise<Record<string, EsExecution>> {
    if (executionIds.size === 0) {
      return {};
    }

    const mgetResponse = await this.esClient.mget<EsExecution>({
      index: this.indexName,
      ids: Array.from(executionIds),
    });

    const executions: Record<string, EsExecution> = {};
    for (const doc of mgetResponse.docs) {
      if ('found' in doc && doc.found && doc._source) {
        executions[doc._source.id] = doc._source;
      }
    }

    Object.values(executions).forEach((execution) => {
      if (execution.spaceId !== spaceId) {
        delete executions[execution.id];
      }
    });

    return executions;
  }

  // TODO REMOVE THIS
  public async getExecutionById(executionId: string): Promise<EsExecution | null> {
    const response = await this.esClient.get<EsExecution>({
      index: this.indexName,
      id: executionId,
    });
    return response._source || null;
  }

  public async bulkCreate(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    executions.forEach((execution) => {
      if (!execution.id) {
        throw new Error('Execution ID is required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: false, // Performance optimization: documents become searchable after next refresh (~1s)
      index: this.indexName,
      body: executions.flatMap((execution) => [{ create: { _id: execution.id } }, execution]),
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
        `Failed to upsert ${erroredDocuments.length} step executions: ${JSON.stringify(
          erroredDocuments
        )}`
      );
    }
  }

  public async bulkUpsert(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    executions.forEach((execution) => {
      if (!execution.id) {
        throw new Error('Execution ID is required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: false, // Performance optimization: documents become searchable after next refresh (~1s)
      index: this.indexName,
      body: executions.flatMap((execution) => [
        { update: { _id: execution.id } },
        { doc: execution, doc_as_upsert: true },
      ]),
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
        `Failed to upsert ${erroredDocuments.length} step executions: ${JSON.stringify(
          erroredDocuments
        )}`
      );
    }
  }

  public async bulkUpdate(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    await this.esClient.bulk({
      index: this.indexName,
      body: executions.flatMap((execution) => [
        { update: { _id: execution.id } },
        { doc: execution },
      ]),
    });
  }

  /**
   * Deletes terminal executions older than the given date, but only for workflow runs
   * where ALL documents (workflow + steps) are in terminal status.
   * This prevents deleting steps belonging to a workflow that still has active steps.
   */
  public async deleteTerminalExecutionsOlderThan(olderThan: Date): Promise<void> {
    const activeRunIds = await this.getWorkflowRunIdsWithNonTerminalExecutions();

    await this.esClient.deleteByQuery({
      index: this.indexName,
      wait_for_completion: true,
      conflicts: 'proceed',
      query: {
        bool: {
          filter: [
            { terms: { status: [...TerminalExecutionStatuses] } },
            { range: { createdAt: { lt: olderThan.toISOString() } } },
          ],
          ...(activeRunIds.length > 0
            ? { must_not: [{ terms: { workflowRunId: activeRunIds } }] }
            : {}),
        },
      },
    });
  }

  private async getWorkflowRunIdsWithNonTerminalExecutions(): Promise<string[]> {
    const response = await this.esClient.search({
      index: this.indexName,
      size: 0,
      query: {
        bool: {
          filter: [{ terms: { status: [...NonTerminalExecutionStatuses] } }],
        },
      },
      aggs: {
        active_runs: {
          terms: { field: 'workflowRunId', size: 10000 },
        },
      },
    });

    const aggs = response.aggregations as
      | { active_runs?: { buckets: Array<{ key: string }> } }
      | undefined;

    return aggs?.active_runs?.buckets.map((b) => b.key) ?? [];
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
    type?: 'workflow' | 'step',
    size: number = 5000
  ): Promise<string[]> {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { concurrencyGroupKey } },
      { term: { spaceId } },
      { term: { type } },
      // Direct match on in-progress statuses is faster than must_not on terminal statuses
      {
        terms: {
          status: NonTerminalExecutionStatuses,
        },
      },
    ];

    // Add exclusion as a nested bool query in filter context.
    // We nest must_not inside a bool query within the filter array (rather than using
    // a top-level must_not) to keep all clauses in the same filter context for consistency
    // and optimal performance. The nested must_not is still in filter context (no scoring).
    if (excludeExecutionId) {
      filterClauses.push({
        bool: {
          must_not: [{ term: { id: excludeExecutionId } }],
        },
      });
    }

    const response = await this.esClient.search<Pick<EsExecution, 'id'>>({
      index: this.indexName,
      query: {
        bool: {
          filter: filterClauses, // Filter context = no scoring = faster
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
    triggeredBy?: string,
    type?: 'workflow' | 'step'
  ) {
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { workflowId } },
      { term: { spaceId } },
      { term: { type } },
      // Direct match on in-progress statuses is faster than must_not on terminal statuses
      {
        terms: {
          status: NonTerminalExecutionStatuses,
        },
      },
    ];

    if (triggeredBy) {
      filterClauses.push({ term: { triggeredBy } });
    }

    const response = await this.esClient.search<EsExecution>({
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
