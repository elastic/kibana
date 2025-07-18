/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/validation';

const changePointExpectErrors = (
  query: string,
  expectedErrors: string[],
  context = mockContext
) => {
  return expectErrors(query, expectedErrors, context, 'change_point', validate);
};

describe('CHANGE_POINT Validation', () => {
  describe('CHANGE_POINT <value> [ ON <condition> AS <type>, <pvalue>]', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('... <value> ...', () => {
      test('validates the most basic query', () => {
        changePointExpectErrors('FROM index | CHANGE_POINT doubleField', []);
      });

      test('validates the full query', () => {
        changePointExpectErrors(
          'FROM index | STATS var0 = AVG(doubleField) BY @timestamp=BUCKET(@timestamp, 8 hours) | CHANGE_POINT var0 ON @timestamp',
          []
        );
      });

      test('raises error on unknown field', () => {
        changePointExpectErrors('FROM index | CHANGE_POINT notExistingField', [
          'Unknown column [notExistingField]',
        ]);
      });

      test('raises error on unsupported field time for value', () => {
        changePointExpectErrors('FROM index | CHANGE_POINT keywordField', [
          'CHANGE_POINT only supports numeric types values, found [keywordField] of type [keyword]',
        ]);
      });

      test('raises error when the default @timestamp field is missing', () => {
        // make sure that @timestamp field is not present
        const newFields = new Map(mockContext.fields);
        newFields.delete('@timestamp');
        const context = {
          ...mockContext,
          fields: newFields,
        };
        changePointExpectErrors(
          'FROM a_index | CHANGE_POINT doubleField',
          [`[CHANGE_POINT] Default @timestamp column is missing`],
          context
        );
      });

      test('allows manual input for ON field', () => {
        changePointExpectErrors('FROM index | CHANGE_POINT doubleField ON keywordField', []);
      });

      test('allows renaming for change point type and pValue columns', () => {
        changePointExpectErrors(
          'FROM index | STATS field = AVG(doubleField) BY @timestamp=BUCKET(@timestamp, 8 hours) | CHANGE_POINT var0 ON @timestamp AS changePointType, pValue',
          []
        );
      });

      test('allows renaming for change point type and pValue columns without specifying the ON field', () => {
        changePointExpectErrors(
          'FROM index | CHANGE_POINT doubleField AS changePointType, pValue',
          []
        );
      });
    });
  });
});
