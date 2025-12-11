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
import { getEsqlQuery } from '.';
import type { QueryOperator } from '@kbn/esql-composer/src/types';

const source = from('index');

describe('getEsqlQuery', () => {
  const emptyQueryOperator: QueryOperator = (sourceQuery) => sourceQuery;

  it('returns a query with serviceName and all three fields when all are present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: 'charge',
          message: { fieldName: 'message', value: 'Payment failed' },
          type: { fieldName: 'exception.type', value: 'ProgrammingError' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND ${fieldConstants.ERROR_CULPRIT_FIELD} == "charge" AND message == "Payment failed" AND exception.type == "ProgrammingError"`
    );
  });

  it('returns a query with serviceName and only culprit when only culprit is present', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: 'charge',
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND ${fieldConstants.ERROR_CULPRIT_FIELD} == "charge"`
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
          culprit: 'charge',
          message: { fieldName: 'message', value: 'Payment failed' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND ${fieldConstants.ERROR_CULPRIT_FIELD} == "charge" AND message == "Payment failed"`
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

  it('ignores fields with missing fieldName', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: 'charge',
          message: { fieldName: '', value: 'Payment failed' },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND ${fieldConstants.ERROR_CULPRIT_FIELD} == "charge"`
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

  it('returns a query with MATCH conditions when type is an array', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          type: { fieldName: 'exception.type', value: ['ProgrammingError', 'UndefinedTable'] },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH(exception.type, "ProgrammingError") AND MATCH(exception.type, "UndefinedTable")`
    );
  });

  it('returns a query with MATCH conditions for array type and other fields', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          culprit: 'charge',
          message: { fieldName: 'message', value: 'Payment failed' },
          type: { fieldName: 'exception.type', value: ['Error', 'withMessage', 'withStack'] },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND ${fieldConstants.ERROR_CULPRIT_FIELD} == "charge" AND message == "Payment failed" AND MATCH(exception.type, "Error") AND MATCH(exception.type, "withMessage") AND MATCH(exception.type, "withStack")`
    );
  });

  it('returns a query with single type value using == when type is not an array', () => {
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

  it('handles array type with single element', () => {
    const result = source
      .pipe(
        getEsqlQuery({
          serviceName: 'payment-service',
          type: { fieldName: 'exception.type', value: ['SingleError'] },
        }) || emptyQueryOperator
      )
      .toString();

    expect(result).toEqual(
      `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH(exception.type, "SingleError")`
    );
  });

  describe('message normalization and escaping', () => {
    it('uses == for simple messages without special characters', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Simple error message' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "Simple error message"`
      );
    });

    it('uses MATCH_PHRASE when message contains newlines', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Line 1\nLine 2' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH_PHRASE(message, "Line 1\\nLine 2")`
      );
    });

    it('uses MATCH_PHRASE when message contains Windows line endings (\\r\\n)', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Line 1\r\nLine 2' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH_PHRASE(message, "Line 1\\r\\nLine 2")`
      );
    });

    it('uses MATCH_PHRASE when message contains only tabs', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Column1\tColumn2' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH_PHRASE(message, "Column1\\tColumn2")`
      );
    });

    it('uses MATCH_PHRASE when message contains only carriage returns', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Line 1\rLine 2' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH_PHRASE(message, "Line 1\\rLine 2")`
      );
    });

    it('uses == when message contains only double quotes (parameters handle quotes safely)', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: { fieldName: 'message', value: 'Error: "Deadline Exceeded"' },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "Error: \\"Deadline Exceeded\\""`
      );
    });

    it('uses == for messages with quotes in database error messages', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: {
              fieldName: 'message',
              value:
                'failed to get product: querying products: pq: relation "products" does not exist',
            },
          }) || emptyQueryOperator
        )
        .toString();

      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND message == "failed to get product: querying products: pq: relation \\"products\\" does not exist"`
      );
    });

    it('uses MATCH_PHRASE for complex messages with newlines, tabs and quotes', () => {
      const result = source
        .pipe(
          getEsqlQuery({
            serviceName: 'payment-service',
            message: {
              fieldName: 'message',
              value: 'Error:\n\tstatus = "DEADLINE_EXCEEDED"\n\tdetails = "Deadline Exceeded"',
            },
          }) || emptyQueryOperator
        )
        .toString();

      // Tabs are escaped to \t in MATCH_PHRASE string literal
      expect(result).toEqual(
        `FROM index\n  | WHERE ${fieldConstants.SERVICE_NAME_FIELD} == "payment-service" AND MATCH_PHRASE(message, "Error:\\n\\tstatus = \\"DEADLINE_EXCEEDED\\"\\n\\tdetails = \\"Deadline Exceeded\\"")`
      );
    });
  });
});
