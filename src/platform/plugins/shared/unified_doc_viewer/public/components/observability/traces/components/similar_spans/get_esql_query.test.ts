/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from '@kbn/esql-composer';
import { getEsqlQuery } from './get_esql_query';
import type { QueryOperator } from '@kbn/esql-composer/src/types';

const source = from('index');

describe('getEsqlQuery', () => {
  const emptyQueryOperator: QueryOperator = (sourceQuery) => sourceQuery;

  it('returns a transaction query if transactionType, serviceName and transactionName are present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'orders-service',
          transactionName: 'GET /api/orders',
          transactionType: 'request',
          spanName: 'span-1',
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      'FROM index\n  | WHERE service.name == "orders-service" AND transaction.name == "GET /api/orders" AND transaction.type == "request"'
    );
  });

  it('returns a span query if serviceName and spanName are present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'orders-service',
          spanName: 'span-1',
          transactionName: undefined,
          transactionType: undefined,
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      'FROM index\n  | WHERE service.name == "orders-service" AND span.name == "span-1"'
    );
  });

  it('returns empty query if only serviceName', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'orders-service',
          spanName: undefined,
          transactionName: undefined,
          transactionType: undefined,
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(source.toString());
  });

  it('returns empty query if everything is undefined', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: undefined,
          spanName: undefined,
          transactionName: undefined,
          transactionType: undefined,
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(source.toString());
  });
});
