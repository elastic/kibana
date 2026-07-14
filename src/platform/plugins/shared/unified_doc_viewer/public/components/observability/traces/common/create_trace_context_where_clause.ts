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
import { PROCESSOR_EVENT, ERROR_LOG_LEVEL, OTEL_EVENT_NAME } from '@kbn/apm-types';

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

  // transaction.id and span.id may not be mapped in all log indices (e.g. OTel logs lack
  // transaction.id), so a plain ES|QL field reference would throw a verification_exception.
  // KQL() gracefully returns false for documents where the field is absent.
  const kqlParts: string[] = [];
  if (transactionId) kqlParts.push(`${TRANSACTION_ID_FIELD}: "${transactionId}"`);
  if (spanId) kqlParts.push(`${SPAN_ID_FIELD}: "${spanId}"`);
  if (kqlParts.length > 0) {
    queryString += ` AND KQL("""${kqlParts.join(' OR ')}""")`;
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

  return where(queryString, [{ traceId }]);
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

  const conditions = [
    `${PROCESSOR_EVENT}: "error"`,
    `${ERROR_LOG_LEVEL}: "error"`,
    `${OTEL_EVENT_NAME}: "exception"`,
    `${OTEL_EVENT_NAME}: "error" `,
  ];

  queryString += ` AND  KQL("""${conditions.join(' OR ')}""")`;

  return where(queryString, [{ traceId }]);
};
