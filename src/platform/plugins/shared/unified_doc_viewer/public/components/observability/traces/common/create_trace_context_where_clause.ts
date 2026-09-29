/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { SPAN_ID_FIELD, TRACE_ID_FIELD, TRANSACTION_ID_FIELD } from '@kbn/discover-utils';
import { where } from '@kbn/esql-composer';
import {
  PROCESSOR_EVENT,
  ERROR_LOG_LEVEL,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
} from '@kbn/apm-types';

const createBaseTraceContextFilters = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}) => {
  let queryString = `${TRACE_ID_FIELD} == ?traceId`;

  if (transactionId && spanId) {
    queryString += ` AND (${TRANSACTION_ID_FIELD} == ?transactionId OR ${SPAN_ID_FIELD} == ?spanId)`;
  } else if (transactionId) {
    queryString += ` AND ${TRANSACTION_ID_FIELD} == ?transactionId`;
  } else if (spanId) {
    queryString += ` AND ${SPAN_ID_FIELD} == ?spanId`;
  }

  return queryString;
};

export const createTraceContextWhereClause = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}) => {
  const queryString = createBaseTraceContextFilters({ traceId, spanId, transactionId });
  const params = [{ traceId }, { transactionId }, { spanId }];

  return where(queryString, params);
};

export const createTraceContextWhereClauseForErrors = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}) => {
  let queryString = createBaseTraceContextFilters({ traceId, spanId, transactionId });

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

  queryString += ` AND  KQL("""${conditions.join(' OR ')}""")`;

  const params = [{ traceId }, { transactionId }, { spanId }];

  return where(queryString, params);
};
