/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution, SerializedError } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { getStepExecutionsByWorkflowExecution as getStepExecutionsByWorkflowExecutionShared } from '@kbn/workflows/server';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export type StepExecutionField = keyof EsWorkflowStepExecution;

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Resolves the current write index backing the step executions alias.
   * This is called once when a workflow execution starts so the backing
   * index name can be pinned on the execution document, ensuring all
   * step docs for that execution land in the same backing index even
   * if ILM rolls over mid-execution.
   */
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

  /**
   * Searches for step executions by workflow execution ID.
   *
   * @param executionId - The ID of the workflow execution to search for step executions.
   * @returns A promise that resolves to an array of step executions associated with the given execution ID.
   */
  public async searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: this.indexName,
      query: {
        match: { workflowRunId: executionId },
      },
      sort: 'startedAt:desc',
      size: 10000, // TODO: without it, it returns up to 10 results by default. We should improve this.
    });

    return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
  }

  /**
   * Fetches all step executions for a workflow execution.
   * Uses mget (real-time, O(1)) when stepExecutionIds are available,
   * falls back to search for backward compatibility with older executions.
   */
  public async getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    stepsExecutionWriteIndex?: string,
    stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return getStepExecutionsByWorkflowExecutionShared({
      esClient: this.esClient,
      stepsExecutionIndexAlias: this.indexName,
      stepsExecutionIndex: stepsExecutionWriteIndex,
      workflowExecutionId,
      stepExecutionIds,
    });
  }

  /*
   * Retrieves step executions by their IDs using mget (O(1) operation).
   * This is real-time (reads from translog) and doesn't require index refresh.
   *
   * Boundary normalisation: ES collapses `undefined` to "missing", but the
   * engine relies on the `null` (FAILED) vs `undefined` (evicted) distinction
   * for `output`. When the caller explicitly asked for `output` via
   * `sourceIncludes` and ES returns the doc without that field, normalise to
   * `null` so downstream code sees `JsonValue | null` instead of having to
   * coerce. Open-projection calls (no `sourceIncludes`) preserve ES's exact
   * shape so existing consumers are not affected.
   *
   * @param stepExecutionIds - The IDs of the step executions to retrieve.
   * @returns A promise that resolves to an array of step executions.
   */
  public async getStepExecutionsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    stepsExecutionIndex?: string
  ): Promise<EsWorkflowStepExecution[]> {
    const response = await this.esClient.mget<EsWorkflowStepExecution>({
      index: stepsExecutionIndex ?? this.indexName,
      ids: stepExecutionIds,
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    const outputExplicitlyRequested = !!sourceIncludes?.includes('output' as StepExecutionField);

    const stepExecutions: EsWorkflowStepExecution[] = [];
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const source = doc._source as EsWorkflowStepExecution;
        if (outputExplicitlyRequested && source.output === undefined) {
          source.output = null;
        }
        stepExecutions.push(source);
      }
    }
    return stepExecutions;
  }

  /**
   * Marks non-terminal step executions for a workflow run as FAILED (e.g. after interrupt recovery).
   */
  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError,
    stepsExecutionIndex?: string
  ): Promise<void> {
    const stepExecutions = await this.searchStepExecutionsByExecutionId(workflowExecutionId);
    const nonTerminalSteps = stepExecutions.filter((step) => !isTerminalStatus(step.status));

    if (nonTerminalSteps.length === 0) {
      return;
    }

    const finishedAt = new Date().toISOString();
    await this.bulkUpsert(
      nonTerminalSteps.map((step) => ({
        id: step.id,
        status: ExecutionStatus.FAILED,
        error,
        finishedAt,
      })),
      stepsExecutionIndex
    );
  }

  /**
   * @param targetIndex When provided, writes go to this specific backing index
   *   instead of the alias. Used to pin all step docs for one workflow execution
   *   to the backing index that was current when the execution started.
   */
  public async bulkUpsert(
    stepExecutions: Array<Partial<EsWorkflowStepExecution>>,
    targetIndex?: string
  ): Promise<void> {
    if (stepExecutions.length === 0) {
      return;
    }

    stepExecutions.forEach((stepExecution) => {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: false,
      index: targetIndex ?? this.indexName,
      body: stepExecutions.flatMap((stepExecution) => {
        const timestamp = stepExecution.startedAt ?? new Date().toISOString();
        return [
          { update: { _id: stepExecution.id } },
          {
            doc: {
              ...stepExecution,
              '@timestamp': timestamp,
            },
            doc_as_upsert: true,
          },
        ];
      }),
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
}
