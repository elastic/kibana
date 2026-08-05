/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Builder, esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { SPAN_ID_FIELD, TRACE_ID_FIELD, TRANSACTION_ID_FIELD } from '@kbn/discover-utils';
import { PROCESSOR_EVENT, ERROR_LOG_LEVEL, OTEL_EVENT_NAME } from '@kbn/apm-types';
import { esqlColumn } from '../../../../utils/esql_column';

const createBaseTraceContextFilters = ({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  spanId?: string;
  transactionId?: string;
}): ESQLAstExpression => {
  const traceFilter = esql.exp`${esqlColumn(TRACE_ID_FIELD)} == ${esql.str(traceId)}`;

  if (transactionId && spanId) {
    return Builder.expression.func.binary('and', [
      traceFilter,
      esql.exp`${esqlColumn(TRANSACTION_ID_FIELD)} == ${esql.str(transactionId)} OR ${esqlColumn(
        SPAN_ID_FIELD
      )} == ${esql.str(spanId)}`,
    ]);
  }
  if (transactionId) {
    return Builder.expression.func.binary('and', [
      traceFilter,
      esql.exp`${esqlColumn(TRANSACTION_ID_FIELD)} == ${esql.str(transactionId)}`,
    ]);
  }
  if (spanId) {
    return Builder.expression.func.binary('and', [
      traceFilter,
      esql.exp`${esqlColumn(SPAN_ID_FIELD)} == ${esql.str(spanId)}`,
    ]);
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

  const conditions = [
    `${PROCESSOR_EVENT}: "error"`,
    `${ERROR_LOG_LEVEL}: "error"`,
    `${OTEL_EVENT_NAME}: "exception"`,
    `${OTEL_EVENT_NAME}: "error" `,
  ];

  // The KQL conditions are trusted, static field/value pairs, so they are parsed
  // as a raw ES|QL expression to preserve the triple-quoted literal form.
  const kqlFilter = esql.exp(`KQL("""${conditions.join(' OR ')}""")`);

  return Builder.expression.func.binary('and', [traceContext, kqlFilter]);
};
