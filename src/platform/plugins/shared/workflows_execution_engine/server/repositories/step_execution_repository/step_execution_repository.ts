/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionDataStreamClient } from './data_stream';

export class StepExecutionRepository {
  constructor(private readonly dataStreamClient: StepExecutionDataStreamClient) {}

  /**
   * Searches for step executions by workflow execution ID.
   *
   * @param executionId - The ID of the workflow execution to search for step executions.
   * @returns A promise that resolves to an array of step executions associated with the given execution ID.
   */
  public async searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    const response = await this.dataStreamClient.search({
      query: {
        match: { workflowRunId: executionId },
      },
      sort: [{ startedAt: { order: 'desc' } }],
      size: 10000,
    });

    return response.hits.hits.map((hit) => hit._source as unknown as EsWorkflowStepExecution);
  }

  public async bulkCreate(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void> {
    if (stepExecutions.length === 0) {
      return;
    }

    await this.dataStreamClient.create({
      documents: stepExecutions as Array<Record<string, unknown>>,
    });
  }
}
