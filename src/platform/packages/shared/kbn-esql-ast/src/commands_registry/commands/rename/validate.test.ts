/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../definitions/utils/test_mocks';
import { validate } from './validate';
import { expectErrors } from '../../../definitions/utils/test_functions';

const renameExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'rename', validate);
};

describe('RENAME Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    const newUserDefinedColumns = new Map(mockContext.userDefinedColumns);
    newUserDefinedColumns.set('doubleField + 1', [
      {
        name: 'doubleField + 1',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    newUserDefinedColumns.set('avg(doubleField)', [
      {
        name: 'avg(doubleField)',
        type: 'double',
        location: { min: 0, max: 10 },
      },
    ]);
    const context = {
      ...mockContext,
      userDefinedColumns: newUserDefinedColumns,
    };
    renameExpectErrors('from a_index | rename textField as', [
      'Error: [as] function expects exactly 2 arguments, got 1.',
    ]);
    renameExpectErrors('from a_index | rename missingField as', [
      'Error: [as] function expects exactly 2 arguments, got 1.',
    ]);
    renameExpectErrors('from a_index | rename textField as col0', []);
    renameExpectErrors('from a_index | rename textField AS col0', []);
    renameExpectErrors('from a_index | rename textField As col0', []);
    renameExpectErrors('from a_index | rename textField As col0, col0 AS var0', []);
    renameExpectErrors('from a_index | rename col0 = textField', []);
    renameExpectErrors('from a_index | rename col0 = textField, doubleField AS var0', []);
    renameExpectErrors('from a_index | rename textField = a', ['Unknown column [a]']);
    renameExpectErrors(
      'from a_index | eval doubleField + 1 | rename `doubleField + 1` as col0',
      [],
      context
    );
    renameExpectErrors(
      'from a_index | stats avg(doubleField) | rename `avg(doubleField)` as col0',
      [],
      context
    );
    renameExpectErrors('from a_index |eval doubleField + 1 | rename `doubleField + 1` as ', [
      'Error: [as] function expects exactly 2 arguments, got 1.',
    ]);
    renameExpectErrors('from a_index | rename key* as keywords', ['Unknown column [keywords]']);
  });
});
