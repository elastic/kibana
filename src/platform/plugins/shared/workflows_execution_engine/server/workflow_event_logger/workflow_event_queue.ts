/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowEventFlushOptions } from './types';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';
import { isWorkflowTaskManagerAbortSignal } from '../workflow_task_shutdown';

/** One Elasticsearch bulk request. Larger backlogs drain across subsequent batches. */
const FLUSH_BATCH_SIZE = 500;

/**
 * Warn once a flush sees this many pending events. Execution keeps enqueueing;
 * persistence drains in bounded batches and does not drop events.
 */
const BACKLOG_WARN_THRESHOLD = 10_000;

/** Pending workflow events. Writers enqueue; the persistence loop flushes. */
export class WorkflowEventQueue {
  private events: WorkflowLogEvent[] = [];

  constructor(private logsRepository: LogsRepository, private logger: Logger) {}

  public push(event: WorkflowLogEvent): void {
    this.events.push(event);
  }

  public async flush(options: WorkflowEventFlushOptions = {}): Promise<void> {
    if (this.events.length > BACKLOG_WARN_THRESHOLD) {
      this.logger.warn(
        `Workflow event log persistence is behind; ${this.events.length} events are still queued`
      );
    }

    while (this.events.length > 0) {
      const events = this.events.splice(0, FLUSH_BATCH_SIZE);

      try {
        await this.logsRepository.createLogs(events);

        this.logger.debug(`Successfully indexed ${events.length} workflow events`);
      } catch (error) {
        if (options.signal && isWorkflowTaskManagerAbortSignal(options.signal)) {
          // Best-effort flushes are used after Task Manager aborts; do not re-queue
          // because this process may not get another chance to flush them.
          this.logger.debug(`Failed to index workflow events during best-effort flush`, {
            eventsCount: events.length,
            error: { message: error instanceof Error ? error.message : String(error) },
          });
          return;
        }

        this.logger.error(`Failed to index workflow events: ${error.message}`, {
          eventsCount: events.length,
          error: error.stack,
        });

        this.events = events.concat(this.events);
        return;
      }
    }
  }
}
