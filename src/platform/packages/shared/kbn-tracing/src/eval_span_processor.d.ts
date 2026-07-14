import type { Context } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
export interface EvalBaggageField {
    baggageKey: string;
    attributeKey?: string;
}
/**
 * Copies configured eval baggage fields onto spans as attributes.
 *
 * This enables correlating traces (`traces-*`) with eval score docs
 * by filtering on `attributes.<attributeKey>`.
 */
export declare class EvalSpanProcessor implements tracing.SpanProcessor {
    private readonly fields;
    constructor(fields: EvalBaggageField[]);
    onStart(span: tracing.Span, parentContext: Context): void;
    onEnd(_span: tracing.ReadableSpan): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
