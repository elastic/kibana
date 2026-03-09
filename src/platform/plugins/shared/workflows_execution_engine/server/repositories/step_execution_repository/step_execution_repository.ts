/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { type EsWorkflowStepExecution, TerminalExecutionStatuses } from '@kbn/workflows';
import type { StepExecutionDataStreamClient } from './data_stream';
import { WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM } from './data_stream';
import type { ReindexResponse } from '@elastic/elasticsearch/lib/api/types';

export class StepExecutionRepository {
  constructor(
    private readonly dataStreamClient: StepExecutionDataStreamClient,
    private readonly esClient: ElasticsearchClient
  ) {}

  /**
   * Searches for step executions by workflow execution ID from cold storage (data stream).
   *
   * When `fields` is provided, only those properties are fetched via `_source_includes`
   * and the return type is narrowed to `Pick<EsWorkflowStepExecution, K>`.
   */
  public async searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]>;
  public async searchStepExecutionsByExecutionId<K extends keyof EsWorkflowStepExecution>(
    executionId: string,
    fields: K[]
  ): Promise<Array<Pick<EsWorkflowStepExecution, K>>>;
  public async searchStepExecutionsByExecutionId<K extends keyof EsWorkflowStepExecution>(
    executionId: string,
    fields?: K[]
  ): Promise<Array<EsWorkflowStepExecution | Pick<EsWorkflowStepExecution, K>>> {
    const response = await this.dataStreamClient.search({
      query: {
        match: { workflowRunId: executionId },
      },
      sort: [{ startedAt: { order: 'desc' } }],
      size: 10000,
      _source_includes: fields,
    });

    return response.hits.hits.map(
      (hit) => hit._source as unknown as Pick<EsWorkflowStepExecution, K>
    );
  }

  /**
   * Searches for a single step execution by its ID from cold storage (data stream).
   *
   * When `fields` is provided, only those properties are fetched via `_source_includes`
   * and the return type is narrowed to `Pick<EsWorkflowStepExecution, K>`.
   */
  public async searchStepExecutionById(
    stepExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null>;
  public async searchStepExecutionById<K extends keyof EsWorkflowStepExecution>(
    stepExecutionId: string,
    spaceId: string,
    fields: K[]
  ): Promise<Pick<EsWorkflowStepExecution, K> | null>;
  public async searchStepExecutionById<K extends keyof EsWorkflowStepExecution>(
    stepExecutionId: string,
    spaceId: string,
    fields?: K[]
  ): Promise<EsWorkflowStepExecution | Pick<EsWorkflowStepExecution, K> | null> {
    const response = await this.dataStreamClient.search({
      query: {
        bool: {
          filter: [
            {
              term: { id: stepExecutionId },
            },
            {
              term: { spaceId },
            },
            {
              term: { type: 'step' },
            },
          ],
        },
      },
      size: 1,
      _source_includes: fields,
    });

    const hit = response.hits.hits[0];
    return hit ? (hit._source as unknown as Pick<EsWorkflowStepExecution, K>) : null;
  }

  public async bulkCreate(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void> {
    if (stepExecutions.length === 0) {
      return;
    }

    await this.dataStreamClient.create({
      documents: stepExecutions as Array<Record<string, unknown>>,
    });
  }

  public async reindexCompletedStepExecutionsFrom(params: {
    sourceIndex: string;
    olderThan: Date;
  }): Promise<ReindexResponse> {
    const { sourceIndex, olderThan } = params;

    const response = await this.esClient.reindex({
      // wait_for_completion: false,
      wait_for_completion: true,
      conflicts: 'proceed',
      source: {
        index: sourceIndex,
        query: {
          bool: {
            filter: [
              { term: { type: 'step' } },
              { terms: { status: [...TerminalExecutionStatuses] } },
              { range: { createdAt: { lt: olderThan.toISOString() } } },
            ],
          },
        },
      },
      dest: { index: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM, op_type: 'create' },
      script: {
        source: "ctx._source['@timestamp'] = ctx._source.createdAt",
      },
    });

    return response;
  }
}
