/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Span, SpanStatusCode, Tracer, trace, context } from '@opentelemetry/api';
import { of, throwError } from 'rxjs';
import { WithActiveSpan, withActiveSpan } from './with_active_span';
import { last } from 'lodash';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';

const createMockSpan = () => {
  return {
    setStatus: jest.fn(),
    end: jest.fn(),
    recordException: jest.fn(),
    isRecording: jest.fn().mockReturnValue(true),
  } as unknown as Span;
};

const createMockTracer = (span: Span) => {
  return {
    startActiveSpan: jest.fn((...args: Parameters<WithActiveSpan>) => {
      const cb = last(args)! as Function;
      return cb(span);
    }),
  } as unknown as Tracer;
};

/**
 * Sets up an in-memory tracer provider and returns both the tracer and the exporter
 * so that tests can assert on the finished spans without any mocks.
 */
const setupInMemoryTracer = () => {
  const exporter = new tracing.InMemorySpanExporter();
  const provider = new tracing.BasicTracerProvider({
    spanProcessors: [new tracing.SimpleSpanProcessor(exporter)],
    sampler: new tracing.AlwaysOnSampler(),
  });
  const tracer = provider.getTracer('test');

  return { tracer, exporter };
};

describe('withActiveSpan', () => {
  let cm: AsyncHooksContextManager;

  beforeAll(() => {
    cm = new AsyncHooksContextManager().enable();
    context.setGlobalContextManager(cm);
  });

  afterAll(() => {
    cm.disable();
  });

  it('returns the callback result unchanged when no tracer is provided', () => {
    const result = withActiveSpan('no-tracer', () => 123);
    expect(result).toBe(123);
  });

  it('handles synchronous results – sets OK status and ends span', () => {
    const span = createMockSpan();
    const tracer = createMockTracer(span);

    const res = withActiveSpan('sync', { tracer }, (s) => {
      // Ensure we received the span instance coming from the tracer
      expect(s).toBe(span);
      return 'value';
    });

    expect(res).toBe('value');
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(span.end).toHaveBeenCalled();
  });

  it('handles resolved promises – sets OK status and ends span', async () => {
    const span = createMockSpan();
    const tracer = createMockTracer(span);

    const promiseResult = await withActiveSpan('promise-resolve', { tracer }, () =>
      Promise.resolve('done')
    );

    expect(promiseResult).toBe('done');
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(span.end).toHaveBeenCalled();
  });

  it('handles rejected promises – records exception, sets ERROR status and ends span', async () => {
    const span = createMockSpan();
    const tracer = createMockTracer(span);
    const error = new Error('boom');

    await expect(
      withActiveSpan('promise-reject', { tracer }, () => Promise.reject(error))
    ).rejects.toThrow('boom');

    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    expect(span.end).toHaveBeenCalled();
  });

  it('handles observables – sets OK status and ends span on completion', (done) => {
    const span = createMockSpan();
    const tracer = createMockTracer(span);

    const obs$ = withActiveSpan('observable', { tracer }, () => of(1, 2));

    const receivedValues: number[] = [];
    obs$.subscribe({
      next: (v) => receivedValues.push(v),
      error: (err) => done(err),
      complete: () => {
        try {
          expect(receivedValues).toEqual([1, 2]);
          expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
          expect(span.end).toHaveBeenCalled();
          done();
        } catch (e) {
          done(e);
        }
      },
    });
  });

  it('handles observable errors – records exception, sets ERROR status and ends span', (done) => {
    const span = createMockSpan();
    const tracer = createMockTracer(span);
    const error = new Error('observable-failed');

    const obs$ = withActiveSpan('observable-error', { tracer }, () => throwError(() => error));

    obs$.subscribe({
      next: () => {},
      error: (err) => {
        try {
          expect(err).toBe(error);
          expect(span.recordException).toHaveBeenCalledWith(error);
          expect(span.setStatus).toHaveBeenCalledWith({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          expect(span.end).toHaveBeenCalled();
          done();
        } catch (e) {
          done(e);
        }
      },
      complete: () => done(new Error('should not complete')),
    });
  });

  it('starts the next promise span as a sibling under the same parent span', async () => {
    const { tracer, exporter } = setupInMemoryTracer();

    // Create a parent span and activate its context
    await tracer.startActiveSpan('parent', async (span) => {
      await withActiveSpan('promise-first', { tracer }, async () => {
        await withActiveSpan('promise-first-inner', { tracer }, () => {
          return Promise.resolve();
        });

        await withActiveSpan('promise-second-inner', { tracer }, () => {
          return Promise.resolve();
        });
        return Promise.resolve('done');
      });

      // Start a second span **after** the first one has resolved
      await withActiveSpan('promise-second', { tracer }, () => 'ok');

      span.end();

      const spans = exporter.getFinishedSpans();

      expect(spans).toHaveLength(5); // parent + two children + two grandchildren

      const first = spans.find((s) => s.name === 'promise-first')!;
      const firstInner = spans.find((s) => s.name === 'promise-first-inner')!;
      const secondInner = spans.find((s) => s.name === 'promise-second-inner')!;

      const second = spans.find((s) => s.name === 'promise-second')!;

      // Both child spans should have the parent span ID as their parent
      expect(first.parentSpanContext?.spanId).toBe(span.spanContext().spanId);
      expect(second.parentSpanContext?.spanId).toBe(span.spanContext().spanId);

      // Both inner child spans should have the id of promise-first as their parent
      expect(firstInner.parentSpanContext?.spanId).toBe(first.spanContext().spanId);
      expect(secondInner.parentSpanContext?.spanId).toBe(first.spanContext().spanId);
    });
  });

  it('starts the next observable span as a sibling under the same parent span (including inner children)', (done) => {
    const { tracer, exporter } = setupInMemoryTracer();

    const parent = tracer.startSpan('parent');

    context.with(trace.setSpan(context.active(), parent), () => {
      const obs$ = withActiveSpan('obs-first', { tracer }, () => {
        // create grandchildren spans inside the first observable callback
        withActiveSpan('obs-first-inner', { tracer }, () => 'inner-1');
        withActiveSpan('obs-second-inner', { tracer }, () => 'inner-2');
        return of(1);
      });

      obs$.subscribe({
        complete: () => {
          // After completion, start a second span
          withActiveSpan('obs-second', { tracer }, () => 'ok');

          parent.end();

          try {
            const spans = exporter.getFinishedSpans();
            expect(spans).toHaveLength(5); // parent + two children + two grandchildren

            const first = spans.find((s) => s.name === 'obs-first')!;
            const second = spans.find((s) => s.name === 'obs-second')!;
            const firstInner = spans.find((s) => s.name === 'obs-first-inner')!;
            const secondInner = spans.find((s) => s.name === 'obs-second-inner')!;

            // Sibling children of parent
            expect(first.parentSpanContext?.spanId).toBe(parent.spanContext().spanId);
            expect(second.parentSpanContext?.spanId).toBe(parent.spanContext().spanId);
            expect(second.parentSpanContext?.spanId).not.toBe(first.spanContext().spanId);

            // Grandchildren parented by obs-first
            expect(firstInner.parentSpanContext?.spanId).toBe(first.spanContext().spanId);
            expect(secondInner.parentSpanContext?.spanId).toBe(first.spanContext().spanId);

            done();
          } catch (e) {
            done(e);
          }
        },
        error: done,
      });
    });
  });
});
