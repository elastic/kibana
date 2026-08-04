import type { TraceFields } from '../../..';
export declare const getAvailableTraceFields: (traceDoc: TraceFields) => ("service.name" | "event.outcome" | "transaction.duration.us" | "transaction.name" | "span.duration.us" | "span.name")[];
