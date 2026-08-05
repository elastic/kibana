/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution, SerializedError } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { StepExecutionsDataClient } from './data_access_layer';
import { getStepExecutionsByWorkflowExecution as getStepExecutionsByWorkflowExecutionShared } from './data_access_layer/lib/get_step_executions_by_workflow_execution';

export type StepExecutionField = keyof EsWorkflowStepExecution;

export class StepExecutionRepository {
  constructor(private stepExecutionsDataClient: StepExecutionsDataClient) {}

  /**
   * Searches for step executions by workflow execution ID.
   *
   * @param executionId - The ID of the workflow execution to search for step executions.
   * @returns A promise that resolves to an array of step executions associated with the given execution ID.
   */
  public async searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    const response = await this.stepExecutionsDataClient.search({
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
    stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return getStepExecutionsByWorkflowExecutionShared({
      stepExecutionsDataClient: this.stepExecutionsDataClient,
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
    sourceExcludes?: StepExecutionField[]
  ): Promise<EsWorkflowStepExecution[]> {
    const { items } = await this.stepExecutionsDataClient.getByIds(stepExecutionIds, {
      sourceIncludes,
      sourceExcludes,
    });
    const shouldNormalizeOutput = sourceIncludes?.includes('output');
    return items.map(({ document }) => {
      if (shouldNormalizeOutput && document.output === undefined) {
        return { ...document, output: null };
      }
      return document;
    });
  }

  /**
   * Marks non-terminal step executions for a workflow run as FAILED (e.g. after interrupt recovery).
   */
  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError
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
      }))
    );
  }

  public async bulkUpsert(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void> {
    if (stepExecutions.length === 0) {
      return;
    }

    stepExecutions.forEach((stepExecution) => {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    await this.stepExecutionsDataClient.bulk({
      items: stepExecutions.map((stepExecution) => ({
        operation: 'upsert',
        document: stepExecution as Partial<EsWorkflowStepExecution> & { id: string },
      })),
      refresh: false, // Performance optimization: documents become searchable after next refresh (~1s)
    });
  }
}
