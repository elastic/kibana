/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpanLinkDetails } from '@kbn/apm-types';
import {
  SERVICE_NAME_FIELD,
  SPAN_ID_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
} from '@kbn/discover-utils';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { esqlEquals } from '../../../../../../utils/esql_expressions';

export function createSpanNameWhereClause(item: SpanLinkDetails): ESQLAstExpression {
  const transactionId = item.details?.transactionId;
  if (transactionId) {
    return esqlEquals(TRANSACTION_ID_FIELD, transactionId);
  }

  return esqlEquals(SPAN_ID_FIELD, item.spanId);
}

export function createServiceNameWhereClause(item: SpanLinkDetails): ESQLAstExpression | undefined {
  const serviceName = item.details?.serviceName;
  if (!serviceName) return undefined;

  return esqlEquals(SERVICE_NAME_FIELD, serviceName);
}

export function createTraceIdWhereClause(item: SpanLinkDetails): ESQLAstExpression {
  return esqlEquals(TRACE_ID_FIELD, item.traceId);
}
