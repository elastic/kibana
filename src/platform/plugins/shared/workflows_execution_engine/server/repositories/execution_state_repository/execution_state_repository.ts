/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkOperationType, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  EsExecution,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  ExecutionStatus,
} from '@kbn/workflows';
import { NonTerminalExecutionStatuses, TerminalExecutionStatuses } from '@kbn/workflows/types/v1';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../../common';

export class ExecutionStateRepository {
  private indexName = WORKFLOWS_EXECUTION_STATE_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Fetches workflow executions by known IDs via mget (O(1) lookup, not subject to refresh interval).
   * Results are filtered to the given spaceId and only include documents with `type: 'workflow'`.
   *
   * When `fields` is provided, only those properties are included in the response
   * and the return type is narrowed to `Pick<EsWorkflowExecution, K>`.
   */
  public async getWorkflowExecutions(
    executionIds: Set<string>,
    spaceId: string
  ): Promise<Record<string, EsWorkflowExecution>>;
  public async getWorkflowExecutions<K extends keyof EsWorkflowExecution>(
    executionIds: Set<string>,
    spaceId: string,
    fields: K[]
  ): Promise<Record<string, Pick<EsWorkflowExecution, K>>>;
  public async getWorkflowExecutions<K extends keyof EsWorkflowExecution>(
    executionIds: Set<string>,
    spaceId: string,
    fields?: K[]
  ): Promise<Record<string, EsWorkflowExecution | Pick<EsWorkflowExecution, K>>> {
    return (await this.getExecutions(executionIds, spaceId, 'workflow', fields)) as Record<
      string,
      Pick<EsWorkflowExecution, K>
    >;
  }

  /**
   * Fetches step executions by known IDs via mget (O(1) lookup, not subject to refresh interval).
   * Results are filtered to the given spaceId and only include documents with `type: 'step'`.
   *
   * When `fields` is provided, only those properties are included in the response
   * and the return type is narrowed to `Pick<EsWorkflowStepExecution, K>`.
   */
  public async getStepExecutions(
    executionIds: Set<string>,
    spaceId: string
  ): Promise<Record<string, EsWorkflowStepExecution>>;
  public async getStepExecutions<K extends keyof EsWorkflowStepExecution>(
    executionIds: Set<string>,
    spaceId: string,
    fields: K[]
  ): Promise<Record<string, Pick<EsWorkflowStepExecution, K>>>;
  public async getStepExecutions<K extends keyof EsWorkflowStepExecution>(
    executionIds: Set<string>,
    spaceId: string,
    fields?: K[]
  ): Promise<Record<string, EsWorkflowStepExecution | Pick<EsWorkflowStepExecution, K>>> {
    return (await this.getExecutions(executionIds, spaceId, 'step', fields)) as Record<
      string,
      Pick<EsWorkflowStepExecution, K>
    >;
  }

  public async bulkCreate(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    this.assertExecutionIds(executions);

    const bulkResponse = await this.esClient.bulk({
      refresh: false,
      index: this.indexName,
      body: executions.flatMap((execution) => [{ create: { _id: execution.id } }, execution]),
    });

    this.throwOnBulkErrors(bulkResponse, 'create', 'create');
  }

  public async bulkUpsert(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    this.assertExecutionIds(executions);

    const bulkResponse = await this.esClient.bulk({
      refresh: false,
      index: this.indexName,
      body: executions.flatMap((execution) => [
        { update: { _id: execution.id } },
        { doc: execution, doc_as_upsert: true },
      ]),
    });

    this.throwOnBulkErrors(bulkResponse, 'update', 'upsert');
  }

  public async bulkUpdate(executions: Array<Partial<EsExecution>>): Promise<void> {
    if (executions.length === 0) {
      return;
    }

    const bulkResponse = await this.esClient.bulk({
      index: this.indexName,
      body: executions.flatMap((execution) => [
        { update: { _id: execution.id } },
        { doc: execution },
      ]),
    });

    this.throwOnBulkErrors(bulkResponse, 'update', 'update');
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

  private assertExecutionIds(executions: Array<Partial<EsExecution>>): void {
    for (const execution of executions) {
      if (!execution.id) {
        throw new Error('Execution ID is required');
      }
    }
  }

  private throwOnBulkErrors(
    response: BulkResponse,
    actionKey: BulkOperationType,
    operationName: string
  ): void {
    if (!response.errors) {
      return;
    }

    const erroredDocuments = response.items
      .filter((item) => item[actionKey]?.error)
      .map((item) => ({
        id: item[actionKey]?._id,
        error: item[actionKey]?.error,
        status: item[actionKey]?.status,
      }));

    throw new Error(
      `Failed to ${operationName} ${erroredDocuments.length} executions: ${JSON.stringify(
        erroredDocuments
      )}`
    );
  }

  /**
   * Fetches executions by ID via mget, filtering by spaceId and optionally by type.
   * When fields is provided, only those properties are included in the response.
   */
  private async getExecutions(
    executionIds: Set<string>,
    spaceId: string,
    type?: 'workflow' | 'step',
    fields?: string[]
  ): Promise<Record<string, EsExecution>> {
    if (executionIds.size === 0) {
      return {};
    }

    const mgetResponse = await this.esClient.mget<EsExecution>({
      index: this.indexName,
      ids: Array.from(executionIds),
      _source: fields || true,
    });

    const executions: Record<string, EsExecution> = {};
    for (const doc of mgetResponse.docs) {
      if ('found' in doc && doc.found && doc._source) {
        executions[doc._source.id] = doc._source;
      }
    }

    Object.values(executions).forEach((execution) => {
      if (execution.spaceId !== spaceId || (type && execution.type !== type)) {
        delete executions[execution.id];
      }
    });

    return executions;
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
