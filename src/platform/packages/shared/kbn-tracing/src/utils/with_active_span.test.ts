/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { of, throwError } from 'rxjs';
import { WithActiveSpan, withActiveSpan } from './with_active_span';
import { last } from 'lodash';

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

describe('withActiveSpan', () => {
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
});
