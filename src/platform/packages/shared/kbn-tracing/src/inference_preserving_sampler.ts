/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Context, SpanKind, Link, Attributes } from '@opentelemetry/api';
import { propagation } from '@opentelemetry/api';
import { tracing } from '@elastic/opentelemetry-node/sdk';

import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from '@kbn/inference-tracing';

/**
 * Sampler wrapper that ensures inference spans are always recorded, even when
 * the global sample rate drops them.
 *
 * For non-inference spans it is a transparent pass-through.
 *
 * For inference spans (identified by the `kibana.inference.tracing` baggage):
 * - If the delegate already samples them, the decision is returned as-is.
 * - If the delegate drops them (NOT_RECORD), the decision is upgraded to
 *   RECORD (without the SAMPLED flag). Domain-specific processors (e.g.
 *   AgentBuilderSpanProcessor) can then force the SAMPLED flag on a copy
 *   for their own export pipeline.
 */
export class InferencePreservingSampler implements tracing.Sampler {
  constructor(private readonly delegate: tracing.Sampler) {}

  shouldSample(
    ctx: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): tracing.SamplingResult {
    const result = this.delegate.shouldSample(ctx, traceId, spanName, spanKind, attributes, links);

    if (result.decision !== tracing.SamplingDecision.NOT_RECORD) {
      return result;
    }

    const baggage = propagation.getBaggage(ctx);
    const inInferenceContext =
      baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value === BAGGAGE_TRACKING_BEACON_VALUE;

    if (!inInferenceContext) {
      return result;
    }

    return {
      ...result,
      decision: tracing.SamplingDecision.RECORD,
    };
  }

  toString(): string {
    return `InferencePreservingSampler{${this.delegate}}`;
  }
}
