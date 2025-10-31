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

  public async bulkUpsert(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void> {
    await this.ensureIndexExists();

    if (stepExecutions.length === 0) {
      return;
    }

    stepExecutions.forEach((stepExecution) => {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: true,
      index: this.indexName,
      body: stepExecutions.flatMap((stepExecution) => [
        { update: { _id: stepExecution.id } },
        { doc: stepExecution, doc_as_upsert: true },
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
}
