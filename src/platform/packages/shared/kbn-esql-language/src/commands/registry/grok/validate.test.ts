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

const grokExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'grok', validate);
};

describe('GROK Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates the most basic query', () => {
    grokExpectErrors('from a_index | grok textField """%{WORD:textPrts} %{WORD:textPrts}"""', []);
    grokExpectErrors('from a_index | grok doubleField """%{WORD:textPrts} %{WORD:textPrts}"""', [
      'GROK only supports values of type keyword, text. Found "doubleField" of type double',
    ]);
    grokExpectErrors(
      'from a_index | grok textField """%{WORD:textPrts} %{WORD:textPrts}""" | keep textPrts',
      []
    );
  });
});
