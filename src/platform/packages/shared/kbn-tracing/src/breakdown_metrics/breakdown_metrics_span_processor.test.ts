/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HrTime } from '@opentelemetry/api';
import { Span, ReadableSpan } from '@opentelemetry/sdk-trace-node';
import {
  BreakdownMetricsSpanProcessor,
  BreakdownMetricSpanProcessorOptions,
} from './breakdown_metrics_span_processor';
import { Histogram } from '@opentelemetry/api-metrics';

const msToHr = (ms: number): HrTime => {
  const seconds = Math.floor(ms / 1000);
  const nano = (ms - seconds * 1000) * 1e6;
  return [seconds, nano] as HrTime;
};

// Simple unique id generator for spans
let idCounter = 1;

function nextId() {
  return (idCounter++).toString(16).padStart(16, '0');
}

function createSpanMock({
  start,
  end,
  parent,
}: {
  start: number;
  end: number;
  parent?: Span | ReadableSpan;
}): Span & ReadableSpan {
  const spanId = nextId();
  const spanContext = () => ({ traceId: 'trace', spanId });
  return {
    startTime: msToHr(start),
    endTime: msToHr(end),
    spanContext,
    parentSpanContext: parent ? parent.spanContext() : undefined,
    attributes: {},
  } as unknown as Span & ReadableSpan;
}

function createMockHistogram(): jest.Mocked<Histogram> {
  return {
    record: jest.fn(),
  };
}

function createMockOptions(): BreakdownMetricSpanProcessorOptions & {
  histogram: jest.Mocked<Histogram>;
} {
  return {
    histogram: createMockHistogram(),
    limit: 100,
    dimensions: [],
  };
}

describe('BreakdownMetricsSpanProcessor', () => {
  afterEach(() => {
    idCounter = 1;
  });

  it('collects self-time for parent and child span', () => {
    const options = createMockOptions();
    const processor = new BreakdownMetricsSpanProcessor(options);

    const parent = createSpanMock({ start: 0, end: 1000 });
    const child = createSpanMock({ start: 200, end: 400, parent });

    // start both
    processor.onStart(parent);
    processor.onStart(child);

    // end child then parent
    processor.onEnd(child);
    processor.onEnd(parent);

    expect(options.histogram.record.mock.calls.length).toBe(2);

    const childSelfTime = 200 * 1e6;
    const parentSelfTime = 800 * 1e6;

    expect(options.histogram.record.mock.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: childSelfTime }),
        expect.objectContaining({ value: parentSelfTime }),
      ])
    );
  });
});
