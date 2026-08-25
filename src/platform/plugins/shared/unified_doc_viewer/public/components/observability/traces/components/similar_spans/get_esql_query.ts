/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SERVICE_NAME, SPAN_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '@kbn/apm-types';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { esqlAnd, esqlEquals } from '../../../../../utils/esql_expressions';
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
  return esqlAnd([esqlEquals(SERVICE_NAME, serviceName), esqlEquals(SPAN_NAME, spanName)]);
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
  return esqlAnd([
    esqlEquals(SERVICE_NAME, serviceName),
    esqlEquals(TRANSACTION_NAME, transactionName),
    esqlEquals(TRANSACTION_TYPE, transactionType),
  ]);
}
