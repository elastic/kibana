/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SERVICE_NAME, SPAN_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '@kbn/apm-types';
import { where } from '@kbn/esql-composer';
import type { SimilarSpansProps } from '.';

export function getEsqlQuery({
  serviceName,
  spanName,
  transactionName,
  transactionType,
}: Pick<SimilarSpansProps, 'serviceName' | 'spanName' | 'transactionName' | 'transactionType'>) {
  if (transactionType && serviceName && transactionName) {
    return getSimilarTransactionsESQL({ serviceName, transactionName, transactionType });
  }
  if (serviceName && spanName) {
    return getSimilarSpansESQL({ serviceName, spanName });
  }

  return undefined;
}

function getSimilarSpansESQL({ serviceName, spanName }: { serviceName: string; spanName: string }) {
  return where(`${SERVICE_NAME} == ?serviceName AND ${SPAN_NAME} == ?spanName`, {
    serviceName,
    spanName,
  });
}

function getSimilarTransactionsESQL({
  serviceName,
  transactionName,
  transactionType,
}: {
  serviceName: string;
  transactionName: string;
  transactionType: string;
}) {
  return where(
    `${SERVICE_NAME} == ?serviceName AND ${TRANSACTION_NAME} == ?transactionName AND ${TRANSACTION_TYPE} == ?transactionType`,
    { serviceName, transactionName, transactionType }
  );
}
