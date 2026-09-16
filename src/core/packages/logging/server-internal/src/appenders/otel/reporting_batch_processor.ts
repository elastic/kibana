/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diag } from '@opentelemetry/api';
import { BatchLogRecordProcessor, type SdkLogRecord } from '@opentelemetry/sdk-logs';

/** Max frequency of the queue-overflow warning. */
const DROP_WARN_INTERVAL_MS = 30_000;

/**
 * A {@link BatchLogRecordProcessor} that emits a throttled warning when records are discarded
 * because the queue is full — the SDK only counts drops in a self-observability metric, which
 * ships over the same (failing) OTLP pipeline and is therefore invisible during an outage.
 *
 * @internal
 */
export class ReportingBatchLogRecordProcessor extends BatchLogRecordProcessor {
  private dropsSinceLastWarn = 0;
  private lastWarnAt = 0;

  public onEmit(logRecord: SdkLogRecord): void {
    const { _finishedLogRecords: queue, _maxQueueSize: maxQueueSize } = this.internals();
    if (queue !== undefined && maxQueueSize !== undefined && queue.length >= maxQueueSize) {
      this.dropsSinceLastWarn++;
      if (Date.now() - this.lastWarnAt >= DROP_WARN_INTERVAL_MS) {
        this.reportDrops(maxQueueSize);
      }
    }
    super.onEmit(logRecord);
  }

  public shutdown(): Promise<void> {
    // Drops still unreported because of throttling would otherwise be lost.
    if (this.dropsSinceLastWarn > 0) {
      this.reportDrops(this.internals()._maxQueueSize);
    }
    return super.shutdown();
  }

  /**
   * The queue and its bound are TS-private on the base class, but plain properties at runtime.
   * Fails open if an SDK upgrade renames them: the warning is lost, logging keeps working.
   */
  private internals(): { _finishedLogRecords?: unknown[]; _maxQueueSize?: number } {
    return this as unknown as { _finishedLogRecords?: unknown[]; _maxQueueSize?: number };
  }

  private reportDrops(maxQueueSize: number | undefined): void {
    diag.warn(
      `OTLP log queue full (maxQueueSize: ${maxQueueSize}), discarded ${this.dropsSinceLastWarn} log records since last report`
    );
    this.lastWarnAt = Date.now();
    this.dropsSinceLastWarn = 0;
  }
}
