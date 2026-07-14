import type { Context, Span, SpanOptions, Tracer } from '@opentelemetry/api';
export interface WithActiveSpanOptions extends SpanOptions {
    tracer?: Tracer;
}
export type WithActiveSpanWithContext = <T>(name: string, opts: WithActiveSpanOptions, ctx: Context, cb: (span?: Span) => T) => T;
export interface WithActiveSpan extends WithActiveSpanWithContext {
    <T>(name: string, cb: (span?: Span) => T): T;
    <T>(name: string, opts: WithActiveSpanOptions, cb: (span?: Span) => T): T;
}
export type WithActiveSpanAsUnion<T = unknown> = ((name: string, cb: (span?: Span) => T) => T) | ((name: string, opts: WithActiveSpanOptions, cb: (span?: Span) => T) => T) | ((name: string, opts: WithActiveSpanOptions, ctx: Context, cb: (span?: Span) => T) => T);
export declare function withActiveSpan<T>(name: string, cb: (span?: Span) => T): T;
export declare function withActiveSpan<T>(name: string, opts: WithActiveSpanOptions, cb: (span?: Span) => T): T;
export declare function withActiveSpan<T>(name: string, opts: WithActiveSpanOptions, ctx: Context, cb: (span?: Span) => T): T;
