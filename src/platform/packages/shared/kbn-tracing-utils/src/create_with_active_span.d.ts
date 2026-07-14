import type { WithActiveSpan, WithActiveSpanOptions, WithActiveSpanWithContext } from './with_active_span';
/**
 * Factory function that creates a version of {@link WithActiveSpan} with
 * default options.
 */
export declare function createWithActiveSpan(defaultOptions: WithActiveSpanOptions, withActiveSpanWrapper?: WithActiveSpanWithContext): WithActiveSpan;
