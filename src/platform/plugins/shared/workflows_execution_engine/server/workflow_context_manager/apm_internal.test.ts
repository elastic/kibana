/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { context, INVALID_TRACEID, trace, TraceFlags } from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type agent from 'elastic-apm-node';
import { getTraceId } from './apm_internal';

// A minimal non-recording span carrying a real trace id. Built from `@opentelemetry/api`
// primitives rather than pulling in an SDK tracer provider, which is not a declared dependency
// of this plugin.
const spanWithTraceId = (traceId: string): Span => {
  const spanContext: SpanContext = {
    traceId,
    spanId: '0000000000000042',
    traceFlags: TraceFlags.SAMPLED,
  };
  return trace.wrapSpanContext(spanContext);
};

const OTEL_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

// `context.with()` is a no-op unless a context manager is registered — without this the active
// span is never visible to `trace.getActiveSpan()` and the OTEL assertions fail for harness
// reasons rather than code reasons.
const contextManager = new AsyncLocalStorageContextManager();

beforeAll(() => {
  contextManager.enable();
  context.setGlobalContextManager(contextManager);
});

afterAll(() => {
  contextManager.disable();
  context.disable();
});

// A transaction with no APM-shaped trace id — what `elastic-apm-node` yields when the deprecated
// agent is inactive, which is the case on any EDOT-only stack (e.g. the Scout eval stack).
const apmlessTransaction = { ids: {} } as unknown as agent.Transaction;

describe('getTraceId', () => {
  describe('APM agent active (legacy path, must be unchanged)', () => {
    it('prefers the documented `ids` field', () => {
      const transaction = {
        ids: { 'trace.id': 'apm-trace-from-ids' },
      } as unknown as agent.Transaction;

      expect(getTraceId(transaction)).toBe('apm-trace-from-ids');
    });

    it('falls back to the private `traceId` shape', () => {
      const transaction = { ids: {}, traceId: 'apm-private-trace' } as unknown as agent.Transaction;

      expect(getTraceId(transaction)).toBe('apm-private-trace');
    });

    it('wins over an active OTEL span, so APM-instrumented behaviour does not change', async () => {
      const span = spanWithTraceId(OTEL_TRACE_ID);
      const transaction = {
        ids: { 'trace.id': 'apm-wins' },
      } as unknown as agent.Transaction;

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getTraceId(transaction)).toBe('apm-wins');
      });
    });
  });

  describe('EDOT / OTEL-only (no APM agent)', () => {
    // Regression test for the measured gap: `elastic-apm-node` is deprecated in favour of the EDOT
    // collector. Under EDOT-only instrumentation every APM lookup returns undefined, so the engine
    // persisted `traceId: undefined` on 7/7 workflow executions even though EDOT was exporting the
    // spans. That silently degraded the rule-creation suite's trace-based routing evaluator to N/A
    // on every example while the suite still reported a pass.
    it('falls back to the active OTEL span context', async () => {
      const span = spanWithTraceId(OTEL_TRACE_ID);

      expect(OTEL_TRACE_ID).not.toBe(INVALID_TRACEID);

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getTraceId(apmlessTransaction)).toBe(OTEL_TRACE_ID);
      });
    });

    it('returns undefined when neither APM nor an OTEL span is active', () => {
      expect(getTraceId(apmlessTransaction)).toBeUndefined();
    });
  });
});
