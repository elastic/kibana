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
 * Regression coverage for the EDOT trace-linkage path.
 *
 * When no APM agent is present, `WorkflowExecutionRuntimeManager.start()` takes
 * its `else` branch and `getTraceId()` is never reached, so the fallback has to
 * be resolvable without an `agent.Transaction`. These tests pin
 * `getActiveOtelTraceId()`, the only trace-id source available on that branch.
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
    // An unsampled context surfaces the all-zero trace id, which matches no span.
    const span = spanWithTraceId('00000000000000000000000000000000');

    await context.with(trace.setSpan(context.active(), span), async () => {
      expect(getActiveOtelTraceId()).toBeUndefined();
    });
  });
});
