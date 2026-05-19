import type { Context, SpanKind, Link, Attributes } from '@opentelemetry/api';
import { tracing } from '@elastic/opentelemetry-node/sdk';
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
export declare class InferencePreservingSampler implements tracing.Sampler {
    private readonly delegate;
    constructor(delegate: tracing.Sampler);
    shouldSample(ctx: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes, links: Link[]): tracing.SamplingResult;
    toString(): string;
}
