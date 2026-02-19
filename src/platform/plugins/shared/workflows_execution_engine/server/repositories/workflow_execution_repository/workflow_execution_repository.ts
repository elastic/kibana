/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_DATA_STREAM } from './constants';
import type { WorkflowExecutionDataStreamClient } from './data_stream';

export class WorkflowExecutionRepository {
  constructor(
    private readonly dataStreamClient: WorkflowExecutionDataStreamClient,
    private readonly esClient: ElasticsearchClient
  ) {}

  /**
   * Retrieves a workflow execution by its ID from the data stream.
   *
   * @param workflowExecutionId - The ID of the workflow execution to retrieve.
   * @param spaceId - The ID of the space associated with the workflow execution.
   * @returns A promise that resolves to the workflow execution document, or null if not found.
   */
  public async getWorkflowExecutionById(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null> {
    const response = await this.dataStreamClient.search({
      query: {
        bool: {
          filter: [{ term: { id: workflowExecutionId } }, { term: { spaceId } }],
        },
      },
      size: 1,
    });

    const doc = response.hits.hits[0]?._source;
    if (!doc) {
      return null;
    }
    return doc as unknown as EsWorkflowExecution;
  }

  /**
   * Creates a new workflow execution document in the data stream.
   *
   * @param workflowExecution - A partial object representing the workflow execution to be created.
   * @returns A promise that resolves when the workflow execution has been indexed.
   */
  public async createWorkflowExecution(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<void> {
    if (!workflowExecution.id) {
      throw new Error('Workflow execution ID is required for creation');
    }

    await this.dataStreamClient.create({
      documents: [workflowExecution as Record<string, unknown>],
    });
  }

  public async reindexCompletedWorkflowExecutionsFrom(params: {
    sourceIndex: string;
    olderThan: Date;
  }): Promise<void> {
    const { sourceIndex, olderThan } = params;
    await this.esClient.reindex({
      // wait_for_completion: false,
      wait_for_completion: true,
      conflicts: 'proceed',
      source: {
        index: sourceIndex,
        query: {
          bool: {
            filter: [
              { term: { type: 'workflow' } },
              { terms: { status: [...TerminalExecutionStatuses] } },
              { range: { createdAt: { lt: olderThan.toISOString() } } },
            ],
          },
        },
      },
      dest: { index: WORKFLOWS_EXECUTIONS_DATA_STREAM, op_type: 'create' },
      script: {
        source: "ctx._source['@timestamp'] = ctx._source.createdAt",
      },
    });
  }
}
