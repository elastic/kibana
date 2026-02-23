/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { context, propagation, trace, TraceFlags } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { EVAL_RUN_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';
import { EvalRunIdSpanProcessor } from './eval_run_id_span_processor';

const TEST_SPAN_CONTEXT = {
  isRemote: false,
  spanId: '1234567890abcdef',
  traceFlags: TraceFlags.SAMPLED,
  traceId: '1234567890abcdef1234567890abcdef',
} as const;

describe('EvalRunIdSpanProcessor', () => {
  let contextManager: AsyncHooksContextManager;
  let processor: EvalRunIdSpanProcessor;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
    processor = new EvalRunIdSpanProcessor();
  });

  afterEach(() => {
    contextManager.disable();
  });

  describe('onStart', () => {
    it('does not set attribute when no baggage is present', () => {
      const mockSpan = createMockSpan();
      const ctx = trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT);

      processor.onStart(mockSpan, ctx);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });

    it('does not set attribute when baggage exists but does not contain eval run id', () => {
      const mockSpan = createMockSpan();
      const baggage = propagation.createBaggage({
        'some.other.key': { value: 'some-value' },
      });
      const ctx = propagation.setBaggage(
        trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT),
        baggage
      );

      processor.onStart(mockSpan, ctx);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });

    it('sets eval run id attribute when present in baggage', () => {
      const mockSpan = createMockSpan();
      const evalRunId = 'test-run-123';
      const baggage = propagation.createBaggage({
        [EVAL_RUN_ID_BAGGAGE_KEY]: { value: evalRunId },
      });
      const ctx = propagation.setBaggage(
        trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT),
        baggage
      );

      processor.onStart(mockSpan, ctx);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(EVAL_RUN_ID_BAGGAGE_KEY, evalRunId);
    });

    it('does not set attribute when span is not recording', () => {
      const mockSpan = createMockSpan(false);
      const baggage = propagation.createBaggage({
        [EVAL_RUN_ID_BAGGAGE_KEY]: { value: 'test-run-123' },
      });
      const ctx = propagation.setBaggage(
        trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT),
        baggage
      );

      processor.onStart(mockSpan, ctx);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });

    it('propagates eval run id through nested contexts', () => {
      const mockSpan1 = createMockSpan();
      const mockSpan2 = createMockSpan();
      const evalRunId = 'nested-run-456';
      const baggage = propagation.createBaggage({
        [EVAL_RUN_ID_BAGGAGE_KEY]: { value: evalRunId },
      });
      const parentCtx = propagation.setBaggage(
        trace.setSpanContext(context.active(), TEST_SPAN_CONTEXT),
        baggage
      );

      // First span
      processor.onStart(mockSpan1, parentCtx);
      expect(mockSpan1.setAttribute).toHaveBeenCalledWith(EVAL_RUN_ID_BAGGAGE_KEY, evalRunId);

      // Child span inherits the baggage
      const childCtx = propagation.setBaggage(
        trace.setSpanContext(parentCtx, {
          ...TEST_SPAN_CONTEXT,
          spanId: 'fedcba0987654321',
        }),
        baggage
      );

      processor.onStart(mockSpan2, childCtx);
      expect(mockSpan2.setAttribute).toHaveBeenCalledWith(EVAL_RUN_ID_BAGGAGE_KEY, evalRunId);
    });
  });

  describe('lifecycle methods', () => {
    it('onEnd does not throw', () => {
      const mockReadableSpan = {} as tracing.ReadableSpan;
      expect(() => processor.onEnd(mockReadableSpan)).not.toThrow();
    });

    it('forceFlush resolves', async () => {
      await expect(processor.forceFlush()).resolves.toBeUndefined();
    });

    it('shutdown resolves', async () => {
      await expect(processor.shutdown()).resolves.toBeUndefined();
    });
  });
});

function createMockSpan(isRecording = true): tracing.Span {
  return {
    isRecording: jest.fn().mockReturnValue(isRecording),
    setAttribute: jest.fn(),
  } as unknown as tracing.Span;
}
