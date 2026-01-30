/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { SPAN_ID_FIELD, TRACE_ID_FIELD, TRANSACTION_ID_FIELD } from '@kbn/discover-utils';
export interface GetLogsQueryParams {
  traceId: string;
  transactionId?: string;
  spanId?: string;
}

export function useLogsQuery({ traceId, spanId, transactionId }: GetLogsQueryParams) {
  return useMemo(() => {
    const queryStrings = [
      `(${TRACE_ID_FIELD}:"${traceId}" OR (not ${TRACE_ID_FIELD}:* AND "${traceId}"))`,
    ];

    if (transactionId) {
      queryStrings.push(
        `(${TRANSACTION_ID_FIELD}:"${transactionId}" OR (not ${TRANSACTION_ID_FIELD}:* AND "${transactionId}"))`
      );
    }

    if (spanId) {
      queryStrings.push(
        `(${SPAN_ID_FIELD}:"${spanId}" OR (not ${SPAN_ID_FIELD}:* AND "${spanId}"))`
      );
    }

    return {
      language: 'kuery',
      query: queryStrings.join(' AND '),
    };
  }, [traceId, spanId, transactionId]);
}
