/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsExecution, EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { NonTerminalExecutionStatuses, TerminalExecutionStatuses } from '@kbn/workflows/types/v1';
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
        .filter((item) => item.create?.error)
        .map((item) => ({
          id: item.create?._id,
          error: item.create?.error,
          status: item.create?.status,
        }));

      throw new Error(
        `Failed to create ${erroredDocuments.length} step executions: ${JSON.stringify(
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
  public async deleteTerminalExecutions(olderThan: Date): Promise<void> {
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

  /**
   * Searches workflow executions in hot storage with filtering, pagination, and optional field selection.
   *
   * When `fields` is provided, only those properties are fetched from Elasticsearch (`_source_includes`)
   * and the return type is narrowed to `Pick<EsWorkflowExecution, K>` accordingly.
   * When omitted, full documents are returned.
   *
   * Results are automatically scoped to `type: 'workflow'` documents.
   */
  public async searchWorkflowExecutions<K extends keyof EsWorkflowExecution>(params: {
    filter: {
      spaceId: string;
      workflowId?: string;
      triggeredBy?: string;
      statuses?: ExecutionStatus[];
      concurrencyGroupKey?: string;
    };
    pagination: {
      size: number;
      from: number;
    };
    fields?: K[];
    sort?: Array<{ field: keyof EsWorkflowExecution; order: 'asc' | 'desc' }>;
  }): Promise<{
    results: Array<Pick<EsWorkflowExecution, K>>;
    total: number;
  }> {
    const { filter, pagination } = params;
    const filterClauses: Array<Record<string, unknown>> = [
      { term: { spaceId: filter.spaceId } },
      { term: { type: 'workflow' } },
    ];

    if (filter.workflowId) {
      filterClauses.push({ term: { workflowId: filter.workflowId } });
    }

    if (filter.triggeredBy) {
      filterClauses.push({ term: { triggeredBy: filter.triggeredBy } });
    }

    if (filter.statuses) {
      filterClauses.push({ terms: { status: filter.statuses } });
    }

    if (filter.concurrencyGroupKey) {
      filterClauses.push({ term: { concurrencyGroupKey: filter.concurrencyGroupKey } });
    }

    const response = await this.esClient.search<EsExecution>({
      index: this.indexName,
      size: pagination.size,
      from: pagination.from,
      _source_includes: params.fields,
      sort: params.sort?.map((sort) => ({ [sort.field]: sort.order })),
      query: {
        bool: {
          filter: filterClauses, // Filter context = no scoring = faster
        },
      },
    });

    return {
      results: response.hits.hits.map((hit) => hit._source as Pick<EsWorkflowExecution, K>),
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0,
    };
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
}
