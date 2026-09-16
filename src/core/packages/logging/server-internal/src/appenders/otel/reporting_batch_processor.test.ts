/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diag } from '@opentelemetry/api';
import type { LogRecordExporter, SdkLogRecord } from '@opentelemetry/sdk-logs';
import { ReportingBatchLogRecordProcessor } from './reporting_batch_processor';

const record = () => ({} as SdkLogRecord);

/** An exporter that never answers, keeping one export in-flight so the queue can fill up. */
const makeStuckExporter = (): LogRecordExporter => ({
  export: jest.fn(),
  forceFlush: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
});

describe('ReportingBatchLogRecordProcessor', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(diag, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /**
   * With maxExportBatchSize 1, the first emit starts an export that never completes
   * (stuck exporter), so every later record queues up; maxQueueSize 2 makes the third
   * queued record the first drop.
   */
  const makeFullProcessor = () => {
    const processor = new ReportingBatchLogRecordProcessor({
      exporter: makeStuckExporter(),
      maxQueueSize: 2,
      maxExportBatchSize: 1,
    });
    processor.onEmit(record()); // extracted into the stuck in-flight export
    processor.onEmit(record()); // queued (1/2)
    processor.onEmit(record()); // queued (2/2), queue now full
    expect(warnSpy).not.toHaveBeenCalled();
    return processor;
  };

  it('does not warn while the queue has capacity', () => {
    makeFullProcessor();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns on the first dropped record', () => {
    const processor = makeFullProcessor();

    processor.onEmit(record()); // dropped

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'OTLP log queue full (maxQueueSize: 2), discarded 1 log records since last report'
    );
  });

  it('throttles subsequent warnings and accumulates the dropped count', () => {
    const processor = makeFullProcessor();

    processor.onEmit(record()); // dropped, warns immediately
    processor.onEmit(record()); // dropped, throttled
    processor.onEmit(record()); // dropped, throttled
    expect(warnSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30_000);
    processor.onEmit(record()); // dropped, throttle window elapsed

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenLastCalledWith(
      'OTLP log queue full (maxQueueSize: 2), discarded 3 log records since last report'
    );
  });

  it('reports drops still unreported because of throttling on shutdown', async () => {
    const processor = makeFullProcessor();

    processor.onEmit(record()); // dropped, warns immediately
    processor.onEmit(record()); // dropped, throttled
    processor.onEmit(record()); // dropped, throttled
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const shutdownPromise = processor.shutdown();
    // The stuck in-flight export would make shutdown's flush wait forever; the warning
    // is emitted synchronously before that, which is all this test needs.
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenLastCalledWith(
      'OTLP log queue full (maxQueueSize: 2), discarded 2 log records since last report'
    );
    void shutdownPromise;
  });

  it('fails open (no warning, no crash) if the SDK internals are not readable', () => {
    const processor = makeFullProcessor();
    // Simulates an SDK upgrade renaming the private field this class reads.
    Reflect.deleteProperty(processor, '_maxQueueSize');

    expect(() => processor.onEmit(record())).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
