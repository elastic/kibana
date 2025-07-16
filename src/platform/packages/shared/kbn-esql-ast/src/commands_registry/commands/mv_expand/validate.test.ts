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

const mvExpandExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'mv_expand', validate);
};

describe('MV_EXPAND Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    mvExpandExpectErrors('from index | mv_expand doubleField', []);
    mvExpandExpectErrors('from index | mv_expand a', ['Unknown column [a]']);

    for (const type of ['text', 'integer', 'date', 'boolean', 'ip']) {
      mvExpandExpectErrors(`from a_index | mv_expand ${type}Field`, []);
    }
  });
});
