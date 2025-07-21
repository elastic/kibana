/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { merge } from 'lodash';

export interface WorkflowLogEvent {
  '@timestamp'?: string;
  message?: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  workflow?: {
    id?: string;
    name?: string;
    execution_id?: string;
    step_id?: string;
    step_name?: string;
    step_type?: string;
  };
  event?: {
    action?: string;
    category?: string[];
    type?: string[];
    provider?: string;
    outcome?: 'success' | 'failure' | 'unknown';
    duration?: number;
    start?: string;
    end?: string;
  };
  error?: {
    message?: string;
    type?: string;
    stack_trace?: string;
  };
  tags?: string[];
  [key: string]: any;
}

export interface WorkflowEventLoggerContext {
  workflowId?: string;
  workflowName?: string;
  executionId?: string;
  stepId?: string;
  stepName?: string;
  stepType?: string;
}

export interface IWorkflowEventLogger {
  logEvent(event: WorkflowLogEvent): void;
  logInfo(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logError(message: string, error?: Error, additionalData?: Partial<WorkflowLogEvent>): void;
  logWarn(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  logDebug(message: string, additionalData?: Partial<WorkflowLogEvent>): void;
  startTiming(event: WorkflowLogEvent): void;
  stopTiming(event: WorkflowLogEvent): void;
  createStepLogger(stepId: string, stepName?: string, stepType?: string): IWorkflowEventLogger;
}

interface Doc {
  index: string;
  body: WorkflowLogEvent;
}

export class WorkflowEventLogger implements IWorkflowEventLogger {
  private esClient: ElasticsearchClient;
  private logger: Logger;
  private indexName: string;
  private context: WorkflowEventLoggerContext;
  private eventQueue: Doc[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private timings: Map<string, Date> = new Map();

  constructor(
    esClient: ElasticsearchClient,
    logger: Logger,
    indexName: string,
    context: WorkflowEventLoggerContext = {}
  ) {
    this.esClient = esClient;
    this.logger = logger;
    this.indexName = indexName;
    this.context = context;
  }

  public logEvent(eventProperties: WorkflowLogEvent): void {
    const event: WorkflowLogEvent = this.createBaseEvent();

    // Merge context, default properties, and provided properties
    merge(event, eventProperties);

    const doc: Doc = {
      index: this.indexName,
      body: event,
    };

    this.queueEvent(doc);
  }

  public logInfo(message: string, additionalData: Partial<WorkflowLogEvent> = {}): void {
    this.logEvent({
      message,
      level: 'info',
      event: {
        action: 'log',
        category: ['workflow'],
        type: ['info'],
        provider: 'workflow-engine',
        ...additionalData.event,
      },
      ...additionalData,
    });
  }

  public logError(
    message: string,
    error?: Error,
    additionalData: Partial<WorkflowLogEvent> = {}
  ): void {
    const errorData: Partial<WorkflowLogEvent> = {};

    if (error) {
      errorData.error = {
        message: error.message,
        type: error.name,
        stack_trace: error.stack,
      };
    }

    this.logEvent({
      message,
      level: 'error',
      event: {
        action: 'error',
        category: ['workflow'],
        type: ['error'],
        provider: 'workflow-engine',
        outcome: 'failure',
        ...additionalData.event,
      },
      ...errorData,
      ...additionalData,
    });
  }

  public logWarn(message: string, additionalData: Partial<WorkflowLogEvent> = {}): void {
    this.logEvent({
      message,
      level: 'warn',
      event: {
        action: 'warning',
        category: ['workflow'],
        type: ['info'],
        provider: 'workflow-engine',
        ...additionalData.event,
      },
      ...additionalData,
    });
  }

  public logDebug(message: string, additionalData: Partial<WorkflowLogEvent> = {}): void {
    this.logEvent({
      message,
      level: 'debug',
      event: {
        action: 'debug',
        category: ['workflow'],
        type: ['info'],
        provider: 'workflow-engine',
        ...additionalData.event,
      },
      ...additionalData,
    });
  }

  public startTiming(event: WorkflowLogEvent): void {
    const timingKey = this.getTimingKey(event);
    this.timings.set(timingKey, new Date());

    // Log start event
    this.logEvent({
      ...event,
      event: {
        ...event.event,
        action: event.event?.action ? `${event.event.action}-start` : 'timing-start',
        start: new Date().toISOString(),
      },
    });
  }

  public stopTiming(event: WorkflowLogEvent): void {
    const timingKey = this.getTimingKey(event);
    const startTime = this.timings.get(timingKey);

    if (startTime) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logEvent({
        ...event,
        event: {
          ...event.event,
          action: event.event?.action ? `${event.event.action}-complete` : 'timing-complete',
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          duration,
          outcome: event.event?.outcome || 'success',
        },
      });

      this.timings.delete(timingKey);
    }
  }

  public createStepLogger(
    stepId: string,
    stepName?: string,
    stepType?: string
  ): IWorkflowEventLogger {
    return new WorkflowEventLogger(this.esClient, this.logger, this.indexName, {
      ...this.context,
      stepId,
      stepName,
      stepType,
    });
  }

  private createBaseEvent(): WorkflowLogEvent {
    return {
      '@timestamp': new Date().toISOString(),
      workflow: {
        id: this.context.workflowId,
        name: this.context.workflowName,
        execution_id: this.context.executionId,
        step_id: this.context.stepId,
        step_name: this.context.stepName,
        step_type: this.context.stepType,
      },
      event: {
        provider: 'workflow-engine',
      },
      tags: ['workflow'],
    };
  }

  private getTimingKey(event: WorkflowLogEvent): string {
    return `${this.context.executionId || 'unknown'}-${event.event?.action || 'unknown'}-${
      this.context.stepId || 'workflow'
    }`;
  }

  private queueEvent(doc: Doc): void {
    this.eventQueue.push(doc);

    // Buffer events and flush them periodically
    if (this.eventQueue.length >= 10) {
      void this.flushEvents();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        void this.flushEvents();
      }, 5000); // Flush every 5 seconds
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    try {
      const bulkBody: Array<Record<string, unknown>> = [];

      for (const doc of events) {
        bulkBody.push({ create: {} });
        bulkBody.push(doc.body);
      }

      await this.esClient.bulk({
        index: this.indexName,
        body: bulkBody,
        refresh: 'wait_for',
      });

      this.logger.debug(`Successfully indexed ${events.length} workflow events`);
    } catch (error) {
      this.logger.error(`Failed to index workflow events: ${error.message}`, {
        eventsCount: events.length,
        error: error.stack,
      });

      // Re-queue events for retry (optional)
      this.eventQueue.unshift(...events);
    }
  }

  public async shutdown(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Flush any remaining events
    await this.flushEvents();
  }
}
