/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsExecution } from '@kbn/workflows';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../../common';

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

  public async getExecutionById(executionId: string): Promise<EsExecution | null> {
    const response = await this.esClient.get<EsExecution>({
      index: this.indexName,
      id: executionId,
    });
    return response._source || null;
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

  public async bulkDelete(executionIds: Set<string>): Promise<void> {
    if (executionIds.size === 0) {
      return;
    }

    await this.esClient.bulk({
      index: this.indexName,
      body: Array.from(executionIds).map((id) => ({ delete: { _id: id } })),
    });
  }
}
