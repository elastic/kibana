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

const joinExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'join', validate);
};

describe('JOIN Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('<LEFT | RIGHT | LOOKUP> JOIN <index> [ AS <alias> ] ON <condition> [, <condition> [, ...]]', () => {
    describe('... <index> ...', () => {
      test('validates the most basic query', () => {
        joinExpectErrors('FROM index | LEFT JOIN join_index ON keywordField', []);
      });

      test('raises error, when index is not suitable for JOIN command', () => {
        joinExpectErrors('FROM index | LEFT JOIN index ON keywordField', [
          '"index" is not a valid JOIN index. Please use a "lookup" mode index.',
        ]);
        joinExpectErrors('FROM index | LEFT JOIN non_existing_index_123 ON keywordField', [
          '"non_existing_index_123" is not a valid JOIN index. Please use a "lookup" mode index.',
        ]);
      });

      test('allows lookup index', () => {
        joinExpectErrors('FROM index | LEFT JOIN join_index ON keywordField', []);
        joinExpectErrors('FROM index | LEFT JOIN join_index_with_alias ON keywordField', []);
      });

      test('allows lookup index alias', () => {
        joinExpectErrors('FROM index | LEFT JOIN join_index_alias_1 ON keywordField', []);
        joinExpectErrors('FROM index | LEFT JOIN join_index_alias_2 ON keywordField', []);
      });

      test('handles correctly conflicts', () => {
        joinExpectErrors(
          'FROM index  | EVAL keywordField = to_IP(keywordField) | LEFT JOIN join_index ON keywordField',
          []
        );
      });
    });

    test.todo('... AS <alias> ...');
  });
});
