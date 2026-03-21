import type { TraceFields } from '../../..';
export declare const getAvailableTraceFields: (traceDoc: TraceFields) => ("event.outcome" | "service.name" | "transaction.name" | "transaction.duration.us" | "span.name" | "span.duration.us")[];
