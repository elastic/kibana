/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Attributes, Context, Link } from '@opentelemetry/api';
import { context, propagation, SpanKind } from '@opentelemetry/api';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from '@kbn/inference-tracing';
import { InferencePreservingSampler } from './inference_preserving_sampler';

const baseSamplingResult: tracing.SamplingResult = {
  decision: tracing.SamplingDecision.NOT_RECORD,
};

const traceId = 'TEST_TRACE_ID';
const spanName = 'test-span';
const attributes: Attributes = {};
const links: Link[] = [];

function createInferenceContext(): Context {
  const baggage = propagation.createBaggage({
    [BAGGAGE_TRACKING_BEACON_KEY]: { value: BAGGAGE_TRACKING_BEACON_VALUE },
  });
  return propagation.setBaggage(context.active(), baggage);
}

describe('InferencePreservingSampler', () => {
  const ctx: Context = context.active();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through when delegate returns RECORD', () => {
    const delegate: tracing.Sampler = {
      shouldSample: jest.fn().mockReturnValue({
        decision: tracing.SamplingDecision.RECORD,
        attributes: {},
      }),
    };
    const sampler = new InferencePreservingSampler(delegate);

    const result = sampler.shouldSample(
      ctx,
      traceId,
      spanName,
      SpanKind.INTERNAL,
      attributes,
      links
    );

    expect(result.decision).toBe(tracing.SamplingDecision.RECORD);
    expect(delegate.shouldSample).toHaveBeenCalledTimes(1);
  });

  it('passes through when delegate returns RECORD_AND_SAMPLED', () => {
    const delegate: tracing.Sampler = {
      shouldSample: jest.fn().mockReturnValue({
        decision: tracing.SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {},
      }),
    };
    const sampler = new InferencePreservingSampler(delegate);

    const result = sampler.shouldSample(
      ctx,
      traceId,
      spanName,
      SpanKind.INTERNAL,
      attributes,
      links
    );

    expect(result.decision).toBe(tracing.SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('passes through when delegate returns NOT_RECORD but no inference baggage', () => {
    const delegate: tracing.Sampler = {
      shouldSample: jest.fn().mockReturnValue(baseSamplingResult),
    };
    const sampler = new InferencePreservingSampler(delegate);
    jest.spyOn(propagation, 'getBaggage').mockReturnValue(undefined);

    const result = sampler.shouldSample(
      ctx,
      traceId,
      spanName,
      SpanKind.INTERNAL,
      attributes,
      links
    );

    expect(result).toEqual(baseSamplingResult);
    expect(result.decision).toBe(tracing.SamplingDecision.NOT_RECORD);
  });

  it('upgrades NOT_RECORD to RECORD when inference baggage is present', () => {
    const delegate: tracing.Sampler = {
      shouldSample: jest.fn().mockReturnValue({
        ...baseSamplingResult,
        attributes: { key: 'value' },
      }),
    };
    const sampler = new InferencePreservingSampler(delegate);
    const inferenceCtx = createInferenceContext();

    const result = sampler.shouldSample(
      inferenceCtx,
      traceId,
      spanName,
      SpanKind.INTERNAL,
      attributes,
      links
    );

    expect(result.decision).toBe(tracing.SamplingDecision.RECORD);
    expect(result.attributes).toEqual({ key: 'value' });
  });
});
