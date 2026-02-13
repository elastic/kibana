/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import {
  initializeDataStreamClient,
  STEP_EXECUTION_EVENTS_DATA_STREAM,
} from './step_execution_data_stream';
import type { StepExecutionEvent } from './step_execution_data_stream';
import { mapEventToStepExecution } from './utils';
export class StepExecutionRepository {
  private indexName = STEP_EXECUTION_EVENTS_DATA_STREAM;

  constructor(
    private esClient: ElasticsearchClient,
    private readonly coreDataStreams: DataStreamsStart
  ) {}

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
    const eventIds = stepExecutionIds.flatMap((id) => [`${id}-started`, `${id}-finished`]);

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
    // await this.oldBulkUpsert(events); // TODO: TO REMOVE
    // return; // TODO: TO REMOVE

    if (events.length === 0) {
      return;
    }

    events.forEach((stepExecution) => {
      if (!stepExecution.stepExecutionId || !stepExecution.type) {
        throw new Error('Event ID and type are required for upsert');
      }
    });

    const dataStreamClient = await initializeDataStreamClient(this.coreDataStreams);

    const bulkResponse = await dataStreamClient.create({
      documents: events.map((event) => ({
        ...event,
        _id: `${event.stepExecutionId}_${event.type}`, // Use a composite ID to allow upsert of started and finished events for the same step execution
      })),
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

  /** TO BE REMOVED */
  private async oldBulkUpsert(events: Array<StepExecutionEvent>): Promise<void> {
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
        { update: { _id: `${event.stepExecutionId}_${event.type}` } },
        { doc: event, doc_as_upsert: true },
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
