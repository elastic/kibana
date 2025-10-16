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
  const queryStrings: string[] = [];

  queryStrings.push(`${TRACE_ID_FIELD} == ?traceId`);

  if (transactionId) {
    queryStrings.push(`${TRANSACTION_ID_FIELD} == ?transactionId`);
  }
  if (spanId) {
    queryStrings.push(`${SPAN_ID_FIELD} == ?spanId`);
  }

  return queryStrings;
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
  const queryStrings = createBaseTraceContextFilters({ traceId, spanId, transactionId });
  const filters = queryStrings.join(' AND ');
  const params = [{ traceId }, { transactionId }, { spanId }];

  return where(filters, params);
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
  const queryStrings = createBaseTraceContextFilters({ traceId, spanId, transactionId });

  queryStrings.push(
    `((${PROCESSOR_EVENT} == "error" OR ${ERROR_LOG_LEVEL} == "error") OR ${OTEL_EVENT_NAME} IN ("exception", "error"))`
  );

  const filters = queryStrings.join(' AND ');
  const params = [{ traceId }, { transactionId }, { spanId }];

  return where(filters, params);
};
