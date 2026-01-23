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
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

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

  public async bulkUpsert(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void> {
    if (stepExecutions.length === 0) {
      return;
    }

    stepExecutions.forEach((stepExecution) => {
      if (!stepExecution.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: false, // Performance optimization: documents become searchable after next refresh (~1s)
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
