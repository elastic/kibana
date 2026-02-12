/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  EsWorkflowStepExecution,
  ExecutionStatus,
  SerializedError,
  StackFrame,
} from '@kbn/workflows';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { JsonValue } from '@kbn/utility-types';

export interface StepExecutionEventBase {
  stepExecutionId: string;
  workflowRunId: string;
  workflowId: string;
  spaceId: string;
  '@timestamp': string;
}

export interface StepExecutionStartedEvent extends StepExecutionEventBase {
  type: 'started';
  scopeStack: StackFrame[];
  workflowRunId: string;
  workflowId: string;
  stepId: string;
  stepType?: string;
  topologicalIndex: number;
  globalExecutionIndex: number;
  stepExecutionIndex: number;
  input?: JsonValue;
}

export interface StepExecutionFinishedEvent extends StepExecutionEventBase {
  type: 'finished';
  error?: SerializedError;
  output?: JsonValue;
}

export interface StepExecutionWaitingEvent extends StepExecutionEventBase {
  type: 'waiting';
  resumeAt: string;
}

export type StepExecutionEvent =
  | StepExecutionStartedEvent
  | StepExecutionFinishedEvent
  | StepExecutionWaitingEvent;

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  public async getStepExecutionEvents(
    stepExecutionIds: string[]
  ): Promise<Array<StepExecutionEvent>> {
    const eventIds = stepExecutionIds.flatMap((id) => [`${id}-started`, `${id}-finished`]);

    const mgetResponse = await this.esClient.mget<
      StepExecutionStartedEvent | StepExecutionFinishedEvent
    >({
      index: this.indexName,
      ids: eventIds,
    });

    const events: Array<StepExecutionEvent> = [];

    for (const doc of mgetResponse.docs) {
      if ('found' in doc && doc.found && doc._source) {
        events.push(doc._source);
      }
    }
    return events;
  }

  public async bulkUpsert(events: Array<StepExecutionEvent>): Promise<void> {
    if (events.length === 0) {
      return;
    }

    events.forEach((stepExecution) => {
      if (!stepExecution.stepExecutionId || !stepExecution.type) {
        throw new Error('Event ID and type are required for upsert');
      }
    });

    const bulkResponse = await this.esClient.bulk({
      refresh: false, // Performance optimization: documents become searchable after next refresh (~1s)
      index: this.indexName,
      body: events.flatMap((event) => [
        { create: { _id: `${event.stepExecutionId}_${event.type}` } },
        event,
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
        `Failed to upsert ${erroredDocuments.length} events: ${JSON.stringify(erroredDocuments)}`
      );
    }
  }
}
