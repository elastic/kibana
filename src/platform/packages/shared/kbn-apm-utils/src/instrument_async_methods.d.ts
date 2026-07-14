import type { SpanOptions } from './with_span';
/**
 * Wrap each async method on a class instance or plain object in a withSpan() call using the method name.
 * Mutates the target (and its prototype chain) in-place.
 */
export declare function instrumentAsyncMethods(name: string, instance: object, getSpanOptions?: (prevSpanOptions: SpanOptions) => SpanOptions): void;
