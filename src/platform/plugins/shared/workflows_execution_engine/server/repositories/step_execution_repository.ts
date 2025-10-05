/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import {
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from '../../common';
import { createIndexWithMappings } from '../../common/create_index';

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;
  private indexInitialized = false;
  constructor(private esClient: ElasticsearchClient) {}

  private async ensureIndexExists() {
    if (this.indexInitialized) return; // Only 1 boolean check after first time

    await createIndexWithMappings({
      esClient: this.esClient,
      indexName: this.indexName,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    });
    this.indexInitialized = true;
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
    await this.ensureIndexExists();

    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: this.indexName,
      query: {
        match: { workflowRunId: executionId },
      },
      sort: 'startedAt:desc',
    });

    return response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
  }

  /**
   * Creates a new step execution document in Elasticsearch.
   *
   * @param stepExecution - A partial object representing the workflow step execution to be indexed.
   * @returns A promise that resolves when the document has been successfully indexed.
   */
  public async createStepExecution(stepExecution: Partial<EsWorkflowStepExecution>): Promise<void> {
    await this.ensureIndexExists();

    if (!stepExecution.id) {
      throw new Error('Step execution ID is required for creation');
    }

    await this.esClient.index({
      index: this.indexName,
      id: stepExecution.id,
      refresh: true,
      document: stepExecution,
    });
  }

  /**
   * Updates a single workflow step execution in the repository.
   *
   * @param stepExecution - A partial object representing the workflow step execution to update.
   * @returns A promise that resolves when the update operation is complete.
   */
  public updateStepExecution(stepExecution: Partial<EsWorkflowStepExecution>): Promise<void> {
    return this.updateStepExecutions([stepExecution]);
  }

  /**
   * Updates multiple step executions in Elasticsearch.
   *
   * This method takes an array of partial `EsWorkflowStepExecution` objects,
   * validates that each has an `id`, and performs a bulk update operation
   * in Elasticsearch for all provided step executions.
   *
   * @param stepExecutions - An array of partial step execution objects to update.
   * Each object must include an `id` property.
   * @throws {Error} If any step execution does not have an `id`.
   * @returns A promise that resolves when the bulk update operation completes.
   */
  public async updateStepExecutions(
    stepExecutions: Array<Partial<EsWorkflowStepExecution>>
  ): Promise<void> {
    await this.ensureIndexExists();

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
