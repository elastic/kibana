/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { mockContext } from '../../../__tests__/commands/context_fixtures';

const dissectExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'dissect', validate);
};

describe('DISSECT Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    dissectExpectErrors('from a_index | dissect textField "%{firstWord}"', []);
    dissectExpectErrors(
      'from a_index | dissect textField "%{firstWord}" append_separator = "-"',
      []
    );
    dissectExpectErrors('from a_index | dissect textField "%{firstWord}" | keep firstWord', []);
  });
  test('raises error on wrong type field', () => {
    dissectExpectErrors('from a_index | dissect doubleField "%{firstWord}"', [
      'DISSECT only supports values of type keyword, text. Found "doubleField" of type double',
    ]);
  });
  test('raises error on wrong append separator', () => {
    dissectExpectErrors('from a_index | dissect textField "%{firstWord}" option ', [
      'Expected [APPEND_SEPARATOR] in [DISSECT] but found [option]',
    ]);

    dissectExpectErrors('from a_index | dissect textField "%{firstWord}" option = 1', [
      'Expected [APPEND_SEPARATOR] in [DISSECT] but found [option]',
    ]);

    dissectExpectErrors('from a_index | dissect textField "%{firstWord}" ignore_missing = true', [
      'Expected [APPEND_SEPARATOR] in [DISSECT] but found [ignore_missing]',
    ]);

    dissectExpectErrors('from a_index | dissect textField "%{firstWord}" append_separator = true', [
      'Invalid value for DISSECT APPEND_SEPARATOR: expected a string, but was [true]',
    ]);
  });
});
