import type { Logger } from 'elastic-apm-node';
import agent from 'elastic-apm-node';
export interface SpanOptions {
    name: string;
    type?: string;
    subtype?: string;
    labels?: Record<string, string>;
    intercept?: boolean;
}
type Span = Exclude<typeof agent.currentSpan, undefined | null>;
export declare function parseSpanOptions(optionsOrName: SpanOptions | string): SpanOptions;
export declare function withSpan<T>(optionsOrName: SpanOptions | string, cb: (span?: Span) => Promise<T>, logger?: Logger): Promise<T>;
export { instrumentAsyncMethods } from './instrument_async_methods';
