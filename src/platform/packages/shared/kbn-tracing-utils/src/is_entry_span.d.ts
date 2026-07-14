import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
/**
 * Determines whether a Span is an entry span. See:
 * https://github.com/elastic/apm/blob/main/specs/agents/tracing-api-otel.md#spans-and-transactions
 */
export declare function isEntrySpan(span: ReadableSpan): boolean | undefined;
