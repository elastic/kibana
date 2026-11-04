/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { IWorkflowEventLogger, WorkflowEventLoggerContext } from './types';
import { WorkflowEventLogger } from './workflow_event_logger';
import type { WorkflowEventQueue } from './workflow_event_queue';

/** Builds loggers that enqueue on one execution's event queue. */
export class WorkflowEventLoggerFactory {
  constructor(
    private readonly logger: Logger,
    private readonly eventQueue: WorkflowEventQueue,
    private readonly enableConsoleLogging: boolean = false
  ) {}

  public createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger {
    return new WorkflowEventLogger(this.logger, this.eventQueue, context, {
      enableConsoleLogging: this.enableConsoleLogging,
    });
  }

  public createWorkflowLogger(workflowId: string, workflowName?: string): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
    });
  }

  public createExecutionLogger(
    workflowId: string,
    executionId: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
      executionId,
    });
  }

  public createStepLogger(
    workflowId: string,
    executionId: string,
    stepId: string,
    stepName?: string,
    stepType?: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
      executionId,
      stepId,
      stepName,
      stepType,
    });
  }
}
