/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { WorkflowEventFlushOptions } from './types';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';
import { abortableTimeout, TimeoutAbortedError } from '../utils';
import { isWorkflowTaskManagerAbortSignal } from '../workflow_task_shutdown';

/** One Elasticsearch bulk request. Larger backlogs drain across subsequent batches. */
const FLUSH_BATCH_SIZE = 500;

/**
 * Warn once a flush sees this many pending events. Execution keeps enqueueing;
 * persistence drains in bounded batches. A batch Elasticsearch will not retry is dropped.
 */
const BACKLOG_WARN_THRESHOLD = 10_000;

/** Pause before the final flush retries a write Elasticsearch may still accept. */
export const RETRYABLE_FLUSH_DELAY_MS = 1_000;

const isRetryableLogIndexError = (error: unknown): boolean =>
  error instanceof EsErrors.ElasticsearchClientError && isRetryableEsClientError(error);

const waitBeforeRetryableFlush = async (signal?: AbortSignal): Promise<void> => {
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, RETRYABLE_FLUSH_DELAY_MS));
    return;
  }

  try {
    await abortableTimeout(RETRYABLE_FLUSH_DELAY_MS, signal);
  } catch (error) {
    if (!(error instanceof TimeoutAbortedError)) {
      throw error;
    }
  }
};

/** Pending workflow events. Writers enqueue; the persistence loop flushes. */
export class WorkflowEventQueue {
  private events: WorkflowLogEvent[] = [];
  private inFlight: Promise<void> | undefined;

  constructor(private logsRepository: LogsRepository, private logger: Logger) {}

  public push(event: WorkflowLogEvent): void {
    this.events.push(event);
  }

  /** Writes the events queued at the start of this call. A second call joins the current write. */
  public flush(options: WorkflowEventFlushOptions = {}): Promise<void> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.flushPending(options).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async flushPending(options: WorkflowEventFlushOptions): Promise<void> {
    if (this.events.length > BACKLOG_WARN_THRESHOLD) {
      this.logger.warn(
        `Workflow event log persistence is behind; ${this.events.length} events are still queued`
      );
    }

    let retryRetryableFailure = false;
    do {
      retryRetryableFailure = false;
      const pending = this.events;
      this.events = [];

      for (let i = 0; i < pending.length; i += FLUSH_BATCH_SIZE) {
        const batch = pending.slice(i, i + FLUSH_BATCH_SIZE);

        try {
          await this.logsRepository.createLogs(batch);

          this.logger.debug(`Successfully indexed ${batch.length} workflow events`);
        } catch (error) {
          if (options.signal && isWorkflowTaskManagerAbortSignal(options.signal)) {
            // Best-effort flushes are used after Task Manager aborts. Drop the batch
            // that failed; batches not yet sent stay queued.
            this.logger.debug(`Failed to index workflow events during best-effort flush`, {
              eventsCount: batch.length,
              error: { message: error instanceof Error ? error.message : String(error) },
            });
            this.events = pending.slice(i + batch.length).concat(this.events);
            return;
          }

          this.logger.error(`Failed to index workflow events: ${error.message}`, {
            eventsCount: batch.length,
            error: error.stack,
          });

          if (isRetryableLogIndexError(error)) {
            this.events = pending.slice(i).concat(this.events);
            if (!options.untilDrained) {
              return;
            }

            await waitBeforeRetryableFlush(options.signal);
            if (options.signal && isWorkflowTaskManagerAbortSignal(options.signal)) {
              return;
            }
            retryRetryableFailure = true;
            break;
          }
        }
      }
    } while (retryRetryableFailure);
  }
}
