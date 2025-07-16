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

const dropExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'drop', validate);
};

describe('DROP Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    // make sure that @timestamp field is not present
    const newUserDefinedColumns = new Map(mockContext.userDefinedColumns);
    newUserDefinedColumns.set('MIN(doubleField * 10)', [
      {
        name: 'MIN(doubleField * 10)',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    newUserDefinedColumns.set('COUNT(*)', [
      {
        name: 'COUNT(*)',
        type: 'integer',
        location: { min: 0, max: 10 },
      },
    ]);
    const context = {
      ...mockContext,
      userDefinedColumns: newUserDefinedColumns,
    };
    dropExpectErrors('from index | drop textField, doubleField, dateField', []);
    dropExpectErrors('from index | drop `any#Char$Field`', []);
    dropExpectErrors('from index | drop t*', []);
    dropExpectErrors('from index | drop t**Field', []);
    dropExpectErrors('from index | drop *Field*', []);
    dropExpectErrors('from index | drop t*F*d', []);
    dropExpectErrors('from index | drop *Field', []);
    dropExpectErrors('from index | drop t*Field', []);
    dropExpectErrors('from index | drop textField', []);
    dropExpectErrors(
      `FROM index | STATS ROUND(AVG(doubleField * 1.5)), COUNT(*), MIN(doubleField * 10) | DROP \`MIN(doubleField * 10)\``,
      [],
      context
    );
    dropExpectErrors(
      `FROM index | STATS COUNT(*), MIN(doubleField * 10), MAX(doubleField)| DROP \`COUNT(*)\``,
      [],
      context
    );
  });
  test('raises error on unknown field', () => {
    dropExpectErrors('from index | drop s*, d*', ['Unknown column [s*]']);
    dropExpectErrors('from index | drop m*', ['Unknown column [m*]']);
    dropExpectErrors('from index | drop *m', ['Unknown column [*m]']);
    dropExpectErrors('from index | drop d*m', ['Unknown column [d*m]']);
  });
  test('raises errors on removing all fields', () => {
    dropExpectErrors('from index | drop *', ['Removing all fields is not allowed [*]']);
    dropExpectErrors('from index | drop textField, *', ['Removing all fields is not allowed [*]']);
  });

  test('raises warning on removing time fields', () => {
    dropExpectErrors('from index | drop @timestamp', [
      'Drop [@timestamp] will remove all time filters to the search results',
    ]);
    dropExpectErrors('from index | drop textField, @timestamp', [
      'Drop [@timestamp] will remove all time filters to the search results',
    ]);
  });
});
