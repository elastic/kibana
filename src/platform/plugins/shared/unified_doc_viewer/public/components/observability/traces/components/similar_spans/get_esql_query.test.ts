/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { getEsqlQuery } from './get_esql_query';

const render = (condition: ReturnType<typeof getEsqlQuery>): string => {
  const query = esql.from('index');
  return (condition ? query.where`${condition}` : query).print('pipe-multiline');
};

describe('getEsqlQuery', () => {
  it('returns a transaction query if transactionType, serviceName and transactionName are present', () => {
    const result = render(
      getEsqlQuery({
        serviceName: 'orders-service',
        transactionName: 'GET /api/orders',
        transactionType: 'request',
        spanName: 'span-1',
      })
    );

    expect(result).toEqual(
      'FROM index\n  | WHERE `service.name` == "orders-service" AND `transaction.name` == "GET /api/orders" AND `transaction.type` == "request"'
    );
  });

  it('returns a span query if serviceName and spanName are present', () => {
    const result = render(
      getEsqlQuery({
        serviceName: 'orders-service',
        spanName: 'span-1',
        transactionName: undefined,
        transactionType: undefined,
      })
    );

    expect(result).toEqual(
      'FROM index\n  | WHERE `service.name` == "orders-service" AND `span.name` == "span-1"'
    );
  });

  it('returns empty query if only serviceName', () => {
    const result = render(
      getEsqlQuery({
        serviceName: 'orders-service',
        spanName: undefined,
        transactionName: undefined,
        transactionType: undefined,
      })
    );

    expect(result).toEqual(esql.from('index').print('pipe-multiline'));
  });

  it('returns empty query if everything is undefined', () => {
    const result = render(
      getEsqlQuery({
        serviceName: undefined,
        spanName: undefined,
        transactionName: undefined,
        transactionType: undefined,
      })
    );

    expect(result).toEqual(esql.from('index').print('pipe-multiline'));
  });
});
