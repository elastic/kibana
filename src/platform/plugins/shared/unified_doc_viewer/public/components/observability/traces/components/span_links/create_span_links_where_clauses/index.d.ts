import type { SpanLinkDetails } from '@kbn/apm-types';
export declare function createSpanNameWhereClause(item: SpanLinkDetails): import("@kbn/esql-composer").QueryOperator;
export declare function createServiceNameWhereClause(item: SpanLinkDetails): import("@kbn/esql-composer").QueryOperator | undefined;
export declare function createTraceIdWhereClause(item: SpanLinkDetails): import("@kbn/esql-composer").QueryOperator;
