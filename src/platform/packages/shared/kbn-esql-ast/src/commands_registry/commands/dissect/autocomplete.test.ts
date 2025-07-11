/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import { ICommandCallbacks } from '../../types';
import { ESQL_STRING_TYPES } from '../../../definitions/types';

const dissectExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'dissect',
    mockCallbacks,
    autocomplete
  );
};

describe('DISSECT Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = {
      getByType: jest.fn(),
    };

    const expectedFields = getFieldNamesByType(ESQL_STRING_TYPES);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
  });

  it('suggests fields after DISSECT', async () => {
    await dissectExpectSuggestions(
      'from a | DISSECT ',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `),
      mockCallbacks
    );
    await dissectExpectSuggestions(
      'from a | DISSECT key/',
      getFieldNamesByType(ESQL_STRING_TYPES).map((name) => `${name} `),
      mockCallbacks
    );
  });

  const constantPattern = '"%{firstWord}" ';
  it('suggests a pattern after a field name', async () => {
    await dissectExpectSuggestions('from a | DISSECT keywordField ', [constantPattern]);
  });

  it('suggests an append separator or pipe after a pattern', async () => {
    dissectExpectSuggestions(`from a | DISSECT keywordField ${constantPattern} /`, [
      'APPEND_SEPARATOR = ',
      '| ',
    ]);
    dissectExpectSuggestions(`from a | DISSECT keywordField ${constantPattern} /`, [
      'APPEND_SEPARATOR = ',
      '| ',
    ]);
  });

  it('suggests append separators', async () => {
    await dissectExpectSuggestions(
      `from a | DISSECT keywordField ${constantPattern} append_separator = `,
      ['":" ', '";" ']
    );
  });

  it('suggests a pipe after an append separator', async () => {
    await dissectExpectSuggestions(
      `from a | DISSECT keywordField ${constantPattern} append_separator = ":" /`,
      ['| ']
    );
  });
});
