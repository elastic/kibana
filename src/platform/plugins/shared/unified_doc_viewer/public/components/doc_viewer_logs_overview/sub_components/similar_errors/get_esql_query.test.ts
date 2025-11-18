/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from '@kbn/esql-composer';
import { fieldConstants } from '@kbn/discover-utils';
import { getEsqlQuery } from './get_esql_query';
import type { QueryOperator } from '@kbn/esql-composer/src/types';

const source = from('index');

describe('getEsqlQuery', () => {
  const emptyQueryOperator: QueryOperator = (sourceQuery) => sourceQuery;

  it('returns a query with serviceName and all three fields when all are present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: 'error.culprit', value: 'charge' },
          message: { fieldName: 'message', value: 'Payment failed' },
          type: { fieldName: 'exception.type', value: 'ProgrammingError' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND error.culprit == "charge" AND message == "Payment failed" AND exception.type == "ProgrammingError"`
    );
  });

  it('returns a query with serviceName and only culprit when only culprit is present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: 'error.culprit', value: 'charge' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND error.culprit == "charge"`
    );
  });

  it('returns a query with serviceName and only message when only message is present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          message: { fieldName: 'message', value: 'Payment failed' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "Payment failed"`
    );
  });

  it('returns a query with serviceName and only type when only type is present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          type: { fieldName: 'exception.type', value: 'ProgrammingError' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND exception.type == "ProgrammingError"`
    );
  });

  it('returns a query with serviceName, culprit and message when both are present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: 'error.culprit', value: 'charge' },
          message: { fieldName: 'message', value: 'Payment failed' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND error.culprit == "charge" AND message == "Payment failed"`
    );
  });

  it('returns undefined when serviceName is not provided', () => {
    const result = getEsqlQuery({});

    expect(result).toBeUndefined();
  });

  it('returns a query with only serviceName when no error fields are provided', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service"`
    );
  });

  it('returns a query with only serviceName when all error field values are undefined', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: 'error.culprit', value: undefined },
          message: { fieldName: 'message', value: undefined },
          type: { fieldName: 'exception.type', value: undefined },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service"`
    );
  });

  it('ignores fields with undefined values', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: 'error.culprit', value: undefined },
          message: { fieldName: 'message', value: 'Payment failed' },
          type: { fieldName: 'exception.type', value: undefined },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "Payment failed"`
    );
  });

  it('ignores fields with missing fieldName', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: { fieldName: '', value: 'charge' },
          message: { fieldName: 'message', value: 'Payment failed' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "Payment failed"`
    );
  });

  it('handles empty string values', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          message: { fieldName: 'message', value: '' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == ""`
    );
  });
});
