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
import type { StepExecutionEvent } from './step_execution_data_stream';
import { mapEventToStepExecution } from './utils';

export class StepExecutionRepository {
  private indexName = '.workflows-step-data-stream-logs-v2';

  constructor(private esClient: ElasticsearchClient) {}

  public async getStepExecutions(
    stepExecutionIds: string[]
  ): Promise<Array<EsWorkflowStepExecution>> {
    const foundEvents = await this.getStepExecutionEvents(stepExecutionIds ?? []);

    const groupedByStepExecutionId = new Map<string, StepExecutionEvent[]>();
    foundEvents.forEach((event) => {
      let existing = groupedByStepExecutionId.get(event.stepExecutionId);
      if (!existing) {
        existing = [];
        groupedByStepExecutionId.set(event.stepExecutionId, existing);
      }
      existing.push(event);
    });
    const stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
    groupedByStepExecutionId.entries().forEach(([stepExecutionId, events]) => {
      const sorted = events.toSorted((a, b) => {
        if (a.type === 'started' && b.type !== 'started') return -1;
        if (a.type !== 'started' && b.type === 'started') return 1;
        return 0;
      });
      stepExecutions.set(
        stepExecutionId,
        sorted.reduce(
          (acc, event) => ({ ...acc, ...mapEventToStepExecution(event) }),
          {}
        ) as EsWorkflowStepExecution
      );
    });

    return Array.from(stepExecutions.values());
  }

  public async getStepExecutionEvents(
    stepExecutionIds: string[]
  ): Promise<Array<StepExecutionEvent>> {
    if (stepExecutionIds.length === 0) {
      return [];
    }

    const eventIds = stepExecutionIds.flatMap((id) => [`${id}_started`, `${id}_finished`]);

    const mgetResponse = await this.esClient.mget<StepExecutionEvent>({
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
