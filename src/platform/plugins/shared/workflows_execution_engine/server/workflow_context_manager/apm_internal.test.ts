/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { context, INVALID_SPANID, INVALID_TRACEID, trace, TraceFlags } from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type agent from 'elastic-apm-node';
import { getActiveOtelSpanId, getActiveOtelTraceId, getTraceId } from './apm_internal';

// Minimal non-recording span carrying a real trace id, built from `@opentelemetry/api`
// primitives so the test does not depend on an SDK tracer provider.
const spanWithTraceId = (traceId: string): Span => {
  const spanContext: SpanContext = {
    traceId,
    spanId: '0000000000000042',
    traceFlags: TraceFlags.SAMPLED,
  };
  return trace.wrapSpanContext(spanContext);
};

const OTEL_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

// `context.with()` is a no-op unless a context manager is registered, otherwise the active
// span is never visible to `trace.getActiveSpan()`.
const contextManager = new AsyncLocalStorageContextManager();

beforeAll(() => {
  contextManager.enable();
  context.setGlobalContextManager(contextManager);
});

afterAll(() => {
  contextManager.disable();
  context.disable();
});

// A transaction with no APM-shaped trace id, as produced when the APM agent is inactive.
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
        expect(getTraceId(transaction) ?? getActiveOtelTraceId()).toBe('apm-wins');
      });
    });
  });

  describe('EDOT / OTEL-only (no APM agent)', () => {
    // Under EDOT-only instrumentation every APM lookup returns undefined, so without the
    // caller-side OTEL fallback the engine persists no trace id even though spans are
    // exported normally. `getTraceId` itself stays transaction-only.
    it('returns undefined for an APM-less transaction even when an OTEL span is active', async () => {
      const span = spanWithTraceId(OTEL_TRACE_ID);

      expect(OTEL_TRACE_ID).not.toBe(INVALID_TRACEID);

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getTraceId(apmlessTransaction)).toBeUndefined();
        expect(getTraceId(apmlessTransaction) ?? getActiveOtelTraceId()).toBe(OTEL_TRACE_ID);
      });
    });

    it('returns undefined when neither APM nor an OTEL span is active', () => {
      expect(getTraceId(apmlessTransaction) ?? getActiveOtelTraceId()).toBeUndefined();
    });

    it('rejects the all-zero INVALID_TRACEID rather than persisting it', async () => {
      // An unsampled context surfaces the all-zero trace id, which matches no span.
      const span = spanWithTraceId('00000000000000000000000000000000');

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getTraceId(apmlessTransaction) ?? getActiveOtelTraceId()).toBeUndefined();
      });
    });
  });

  describe('getActiveOtelSpanId', () => {
    it('returns the active span id', async () => {
      const span = spanWithTraceId(OTEL_TRACE_ID);

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getActiveOtelSpanId()).toBe('0000000000000042');
      });
    });

    it('returns undefined when no span is active', () => {
      expect(getActiveOtelSpanId()).toBeUndefined();
    });

    it('rejects the all-zero INVALID_SPANID rather than persisting it', async () => {
      const spanContext: SpanContext = {
        traceId: OTEL_TRACE_ID,
        spanId: INVALID_SPANID,
        traceFlags: TraceFlags.SAMPLED,
      };
      const span = trace.wrapSpanContext(spanContext);

      await context.with(trace.setSpan(context.active(), span), async () => {
        expect(getActiveOtelSpanId()).toBeUndefined();
      });
    });
  });
});
