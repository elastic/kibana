/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/commands/context_fixtures';
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';

const dropExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'drop', validate);
};

describe('DROP Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    // make sure that @timestamp field is not present
    const newColumns = new Map(mockContext.columns);
    newColumns.set('MIN(doubleField * 10)', {
      name: 'MIN(doubleField * 10)',
      type: 'double',
      location: { min: 0, max: 10 },
      userDefined: true,
    });
    newColumns.set('COUNT(*)', {
      name: 'COUNT(*)',
      type: 'integer',
      location: { min: 0, max: 10 },
      userDefined: true,
    });
    const context = {
      ...mockContext,
      columns: newColumns,
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
    dropExpectErrors('from index | drop s*, d*', ['Unknown column "s*"']);
    dropExpectErrors('from index | drop m*', ['Unknown column "m*"']);
    dropExpectErrors('from index | drop *m', ['Unknown column "*m"']);
    dropExpectErrors('from index | drop d*m', ['Unknown column "d*m"']);
  });

  test('raises warning on removing time fields', () => {
    dropExpectErrors('from index | drop @timestamp', [
      'Dropping "@timestamp" prevents the time range from being applied.',
    ]);
    dropExpectErrors('from index | drop textField, @timestamp', [
      'Dropping "@timestamp" prevents the time range from being applied.',
    ]);
  });
});
