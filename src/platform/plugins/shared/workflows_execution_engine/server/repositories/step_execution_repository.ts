/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { EsWorkflowStepExecution } from '@kbn/workflows';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;
  constructor(private esClient: ElasticsearchClient) {}

  // public async searchStepExecutionsByExecutionId(
  //   executionId: string
  // ): Promise<EsWorkflowStepExecution[]> {
  //   // TODO: To be implemented
  //   // Will be used to fetch step executions by execution ID during state recovery
  //   return [];
  // }

  public async createStepExecution(stepExecution: Partial<EsWorkflowStepExecution>): Promise<void> {
    await this.esClient.index({
      index: this.indexName,
      id: stepExecution.id,
      refresh: true,
      document: stepExecution,
    });
  }

  public updateStepExecution(stepExecution: Partial<EsWorkflowStepExecution>): Promise<void> {
    return this.updateStepExecutions([stepExecution]);
  }

  public async updateStepExecutions(
    stepExecutions: Array<Partial<EsWorkflowStepExecution>>
  ): Promise<void> {
    stepExecutions.forEach((stepExecution) => {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for update');
      }
    });

    await this.esClient?.bulk({
      refresh: true,
      index: this.indexName,
      body: stepExecutions.flatMap((stepExecution) => [
        { update: { _id: stepExecution.id } },
        { doc: stepExecution },
      ]),
    });
  }
}
