/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { context, trace, TraceFlags } from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

import { getActiveOtelTraceId } from './apm_internal';

/**
 * Regression coverage for the EDOT trace-linkage gap.
 *
 * `WorkflowExecutionRuntimeManager.start()` opens with:
 *
 *     const existingTransaction = agent.currentTransaction;
 *     if (existingTransaction) { ...capture trace id... } else { ...no tracing... }
 *
 * Under EDOT-only instrumentation there is NO APM agent, so `currentTransaction` is null and the
 * entire APM branch — including `getTraceId()` — is unreachable. A fallback added *inside*
 * `getTraceId()` therefore never runs in production, even though a unit test calling
 * `getTraceId()` directly passes. That is exactly the false-green this file guards against:
 * the fallback must live on the `else` branch, reachable WITHOUT an `agent.Transaction`.
 *
 * These tests pin `getActiveOtelTraceId()` — the helper that branch calls — since it is the
 * only trace-id source available when no APM transaction exists.
 */
describe('getActiveOtelTraceId (EDOT / no-APM path)', () => {
  const contextManager = new AsyncLocalStorageContextManager();

  beforeAll(() => {
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
  });

  afterAll(() => {
    context.disable();
    contextManager.disable();
  });

  /** Minimal Span stub: `getActiveOtelTraceId` only reads `spanContext()`. */
  const spanWithTraceId = (traceId: string): Span => {
    const spanContext: SpanContext = {
      traceId,
      spanId: '0000000000000001',
      traceFlags: TraceFlags.SAMPLED,
    };
    return { spanContext: () => spanContext } as unknown as Span;
  };

  it('returns the active span trace id when no APM agent is present', async () => {
    const traceId = '0af7651916cd43dd8448eb211c80319c';
    const span = spanWithTraceId(traceId);

    await context.with(trace.setSpan(context.active(), span), async () => {
      expect(getActiveOtelTraceId()).toBe(traceId);
    });
  });

  it('returns undefined when no span is active', () => {
    expect(getActiveOtelTraceId()).toBeUndefined();
  });

  it('rejects the all-zero INVALID_TRACEID rather than persisting it', async () => {
    // An unsampled/never-recorded context surfaces the all-zero trace id. Persisting it would
    // produce workflow executions carrying a trace id that matches no span in the trace store.
    const span = spanWithTraceId('00000000000000000000000000000000');

    await context.with(trace.setSpan(context.active(), span), async () => {
      expect(getActiveOtelTraceId()).toBeUndefined();
    });
  });
});
