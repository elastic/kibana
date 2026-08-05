/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { SERVICE_NAME, SPAN_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '@kbn/apm-types';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { esqlColumn } from '../../../../../utils/esql_column';
import type { SimilarSpansProps } from '.';

export function getEsqlQuery({
  serviceName,
  spanName,
  transactionName,
  transactionType,
}: Pick<SimilarSpansProps, 'serviceName' | 'spanName' | 'transactionName' | 'transactionType'>):
  | ESQLAstExpression
  | undefined {
  if (transactionType && serviceName && transactionName) {
    return getSimilarTransactionsESQL({ serviceName, transactionName, transactionType });
  }
  if (serviceName && spanName) {
    return getSimilarSpansESQL({ serviceName, spanName });
  }

  return undefined;
}

function getSimilarSpansESQL({
  serviceName,
  spanName,
}: {
  serviceName: string;
  spanName: string;
}): ESQLAstExpression {
  return esql.exp`${esqlColumn(SERVICE_NAME)} == ${esql.str(serviceName)} AND ${esqlColumn(
    SPAN_NAME
  )} == ${esql.str(spanName)}`;
}

function getSimilarTransactionsESQL({
  serviceName,
  transactionName,
  transactionType,
}: {
  serviceName: string;
  transactionName: string;
  transactionType: string;
}): ESQLAstExpression {
  return esql.exp`${esqlColumn(SERVICE_NAME)} == ${esql.str(serviceName)} AND ${esqlColumn(
    TRANSACTION_NAME
  )} == ${esql.str(transactionName)} AND ${esqlColumn(TRANSACTION_TYPE)} == ${esql.str(
    transactionType
  )}`;
}
