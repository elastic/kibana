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

const keepExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'keep', validate);
};

describe('KEEP Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
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
    keepExpectErrors('from index | keep keywordField, doubleField, integerField, dateField', []);
    keepExpectErrors(
      'from index | keep `keywordField`, `doubleField`, `integerField`, `dateField`',
      []
    );
    keepExpectErrors('from index | keep 4.5', ['Unknown column [.]']);
    keepExpectErrors('from index | keep `4.5`', ['Unknown column [4.5]']);
    keepExpectErrors('from index | keep missingField, doubleField, dateField', [
      'Unknown column [missingField]',
    ]);
    keepExpectErrors('from index | keep `any#Char$Field`', []);
    keepExpectErrors('from index | keep k*', []);
    keepExpectErrors('from index | keep *Field', []);
    keepExpectErrors('from index | keep k*Field', []);
    keepExpectErrors('from index | keep key*Field', []);
    keepExpectErrors('from index | keep k*, i*', []);
    keepExpectErrors('from index | keep m*', ['Unknown column [m*]']);
    keepExpectErrors('from index | keep *m', ['Unknown column [*m]']);
    keepExpectErrors('from index | keep d*m', ['Unknown column [d*m]']);

    keepExpectErrors(
      `FROM index | STATS ROUND(AVG(doubleField * 1.5)), COUNT(*), MIN(doubleField * 10) | KEEP \`MIN(doubleField * 10)\``,
      [],
      context
    );
    keepExpectErrors(
      `FROM index | STATS COUNT(*), MIN(doubleField * 10), MAX(doubleField)| KEEP \`COUNT(*)\``,
      [],
      context
    );
  });
});
