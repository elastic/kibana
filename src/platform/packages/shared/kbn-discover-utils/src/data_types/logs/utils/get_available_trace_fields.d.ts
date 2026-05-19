import type { TraceFields } from '../../..';
export declare const getAvailableTraceFields: (traceDoc: TraceFields) => ("service.name" | "event.outcome" | "transaction.name" | "transaction.duration.us" | "span.name" | "span.duration.us")[];
