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

export const createTraceContextWhereClause = ({
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

  const params = [{ traceId }, { transactionId }, { spanId }];

  return where(queryString, params);
};
