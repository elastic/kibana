/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstExpression } from '@elastic/esql/types';
import { SPAN_ID_FIELD, TRACE_ID_FIELD, TRANSACTION_ID_FIELD } from '@kbn/discover-utils';
import {
  PROCESSOR_EVENT,
  ERROR_LOG_LEVEL,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
} from '@kbn/apm-types';
import {
  esqlAnd,
  esqlEquals,
  esqlFunction,
  esqlOr,
  esqlString,
} from '../../../../utils/esql_expressions';

const createBaseTraceContextFilters = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}): ESQLAstExpression => {
  const traceFilter = esqlEquals(TRACE_ID_FIELD, traceId);

  if (transactionId && spanId) {
    return esqlAnd([
      traceFilter,
      esqlOr([esqlEquals(TRANSACTION_ID_FIELD, transactionId), esqlEquals(SPAN_ID_FIELD, spanId)]),
    ]);
  }
  if (transactionId) {
    return esqlAnd([traceFilter, esqlEquals(TRANSACTION_ID_FIELD, transactionId)]);
  }
  if (spanId) {
    return esqlAnd([traceFilter, esqlEquals(SPAN_ID_FIELD, spanId)]);
  }

  return traceFilter;
};

export const createTraceContextWhereClause = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}): ESQLAstExpression => createBaseTraceContextFilters({ traceId, spanId, transactionId });

export const createTraceContextWhereClauseForErrors = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}): ESQLAstExpression => {
  const traceContext = createBaseTraceContextFilters({ traceId, spanId, transactionId });

  // Mirrors the `should` clauses and the `must_not exists processor.event` filter of the
  // server-side getUnprocessedOtelErrors query, so that every row rendered in the errors table
  // is also matched by the section-level "Open in Discover" link.
  const unprocessedOtelException = `(${OTEL_EVENT_NAME}: "exception" or ${EXCEPTION_TYPE}: * or ${EXCEPTION_MESSAGE}: *) and not ${PROCESSOR_EVENT}: *`;

  const conditions = [
    `${PROCESSOR_EVENT}: "error"`,
    `${ERROR_LOG_LEVEL}: "error"`,
    `${OTEL_EVENT_NAME}: "error"`,
    `(${unprocessedOtelException})`,
  ];

  const kqlFilter = esqlFunction('KQL', [esqlString(conditions.join(' OR '))]);

  return esqlAnd([traceContext, kqlFilter]);
};
