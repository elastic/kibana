import type { TraceFields } from '../../..';
export declare const getAvailableTraceFields: (traceDoc: TraceFields) => ("event.outcome" | "transaction.name" | "transaction.duration.us" | "span.name" | "span.duration.us" | "service.name")[];
