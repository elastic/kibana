/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPromise } from '@kbn/std';
import { Context, Span, SpanOptions, SpanStatusCode, Tracer, context } from '@opentelemetry/api';
import { core } from '@elastic/opentelemetry-node/sdk';
import { Observable, isObservable } from 'rxjs';
import { getDefaultTracer } from '@kbn/default-tracer';

export interface WithActiveSpanOptions extends SpanOptions {
  tracer?: Tracer;
}

export type WithActiveSpanWithContext = <T>(
  name: string,
  opts: WithActiveSpanOptions,
  ctx: Context,
  cb: (span?: Span) => T
) => T;

export interface WithActiveSpan extends WithActiveSpanWithContext {
  <T>(name: string, cb: (span?: Span) => T): T;
  <T>(name: string, opts: WithActiveSpanOptions, cb: (span?: Span) => T): T;
}

export type WithActiveSpanAsUnion<T = unknown> =
  | ((name: string, cb: (span?: Span) => T) => T)
  | ((name: string, opts: WithActiveSpanOptions, cb: (span?: Span) => T) => T)
  | ((name: string, opts: WithActiveSpanOptions, ctx: Context, cb: (span?: Span) => T) => T);

type Args = Parameters<WithActiveSpanAsUnion>; // gives the desired union

export function withActiveSpan<T>(name: string, cb: (span?: Span) => T): T;
export function withActiveSpan<T>(
  name: string,
  opts: WithActiveSpanOptions,
  cb: (span?: Span) => T
): T;
export function withActiveSpan<T>(
  name: string,
  opts: WithActiveSpanOptions,
  ctx: Context,
  cb: (span?: Span) => T
): T;

/**
 * Starts an active span in the given or currently active context,
 * unwraps returned promises and observables, and automatically
 * records exceptions and sets the status on the span.
 */
export function withActiveSpan(...args: Args) {
  const name: string = args[0];

  const opts: WithActiveSpanOptions = args.length === 2 ? {} : args[1];

  const ctx: Context = args.length === 4 ? args[2] : context.active();

  const cb: (span?: Span) => unknown =
    args.length === 2 ? args[1] : args.length === 3 ? args[2] : args[3];

  const tracer = opts.tracer || getDefaultTracer();

  if (!tracer || core.isTracingSuppressed(ctx)) {
    return cb();
  }

  return tracer.startActiveSpan(name, opts, ctx, (span) => {
    try {
      const res = cb(span);

      if (isPromise(res)) {
        return handlePromise(span, res);
      }

      if (isObservable(res)) {
        return handleObservable(span, ctx, res);
      }

      updateSpanSafely(span, () => {
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });
      return res;
    } catch (error) {
      updateSpanSafely(span, () => {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.end();
      });
      throw error;
    }
  });
}

function handleObservable<T>(
  span: Span,
  parentContext: Context,
  source$: Observable<T>
): Observable<T> {
  const ctx = context.active();

  return new Observable<T>((subscriber) => {
    // Make sure anything that happens during this callback uses the context
    // that was active when this function was called. this ensures correct
    // span parenting
    const subscription = context.with(ctx, () => {
      return source$.subscribe({
        next: (value) => {
          context.with(parentContext, () => {
            subscriber.next(value);
          });
        },
        error: (error) => {
          context.with(parentContext, () => {
            updateSpanSafely(span, () => {
              span.recordException(error);
              span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
              span.end();
            });
            subscriber.error(error);
          });
        },
        complete: () => {
          context.with(parentContext, () => {
            updateSpanSafely(span, () => {
              span.setStatus({
                code: SpanStatusCode.OK,
              });
              span.end();
            });
            subscriber.complete();
          });
        },
      });
    });
    return () => context.with(parentContext, () => subscription.unsubscribe());
  });
}

function handlePromise<T>(span: Span, promise: Promise<T>): Promise<T> {
  return promise
    .then((res) => {
      updateSpanSafely(span, () => {
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });
      return res;
    })
    .catch((error) => {
      updateSpanSafely(span, () => {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.end();
      });
      throw error;
    });
}

function updateSpanSafely(span: Span, cb: () => void) {
  if (span.isRecording()) {
    cb();
  }
}
