/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { unifiedTracesByIdRoute } from './unified_traces_by_id';
import { unifiedTracesByIdSummaryRoute } from './unified_traces_by_id_summary';
import { unifiedTracesByIdErrorsRoute } from './unified_traces_by_id_errors';
import { unifiedTracesRootSpanRoute } from './unified_traces_root_span';
import { rootTransactionByTraceIdRoute } from './root_transaction_by_trace_id';
import { transactionByNameRoute } from './transaction_by_name';
import { transactionByIdRoute } from './transaction_by_id';
import { transactionFromTraceByIdRoute } from './transaction_from_trace_by_id';
import { spanFromTraceByIdRoute } from './span_from_trace_by_id';
import { unifiedTraceSpanRoute } from './unified_trace_span';
import { tracesRoute } from './traces';

export const tracesRouteDefinitions = {
  unifiedTracesById: unifiedTracesByIdRoute,
  unifiedTracesByIdSummary: unifiedTracesByIdSummaryRoute,
  unifiedTracesByIdErrors: unifiedTracesByIdErrorsRoute,
  unifiedTracesRootSpan: unifiedTracesRootSpanRoute,
  rootTransactionByTraceId: rootTransactionByTraceIdRoute,
  transactionByName: transactionByNameRoute,
  transactionById: transactionByIdRoute,
  transactionFromTraceById: transactionFromTraceByIdRoute,
  spanFromTraceById: spanFromTraceByIdRoute,
  unifiedTraceSpan: unifiedTraceSpanRoute,
  traces: tracesRoute,
};

export type { UnifiedTracesByIdResponse } from './unified_traces_by_id';
export type { UnifiedTracesByIdSummaryResponse } from './unified_traces_by_id_summary';
export type { UnifiedTracesRootSpanResponse } from './unified_traces_root_span';
export type { RootTransactionByTraceIdResponse } from './root_transaction_by_trace_id';
export type { TransactionByNameResponse } from './transaction_by_name';
export type { TransactionByIdResponse } from './transaction_by_id';
export type { TransactionFromTraceByIdResponse } from './transaction_from_trace_by_id';
export type { SpanFromTraceByIdResponse } from './span_from_trace_by_id';
export type { UnifiedTraceSpanResponse } from './unified_trace_span';
export type { TopTracesPrimaryStatsResponse, BucketKey } from './traces';
