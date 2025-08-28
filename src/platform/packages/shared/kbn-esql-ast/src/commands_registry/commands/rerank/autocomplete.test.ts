/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  mockContext,
  lookupIndexFields,
  getMockCallbacks,
} from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions } from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';

const rerankExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'rerank',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('RERANK Autocomplete', () => {
  const expectedFieldsForRerankOn = [
    '@timestamp',
    'any#Char$Field',
    'booleanField',
    'col0',
    'counterIntegerField',
    'dateField',
    'dateNanosField',
    'doubleField',
    'geoPointField',
    'geoShapeField',
    'integerField',
    'integerPrompt',
    'ipField',
    'ipPrompt',
    'keywordField',
    'longField',
    'prompt',
    'renamedField',
    'textField',
    'var0',
    'versionField',
  ];

  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  test('suggestions for basic rerank command', async () => {
    const expected = [
      '"query" ', // String literal suggestion with trailing space
      'col0 = ', // New column assignment suggestion
    ];

    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await rerankExpectSuggestions('from a | rerank ', expected, mockCallbacks);
    await rerankExpectSuggestions('FROM a | RERANK ', expected, mockCallbacks);
  });

  test('should suggest ON and pipe after query', async () => {
    await rerankExpectSuggestions('from a | rerank "query" ', ['ON ']);
  });

  test('should suggest comma, expression, WITH and pipe after selecting a field', async () => {
    await rerankExpectSuggestions('from a | rerank "query" on textField', ['textField ']);
  });

  test('after comma and space, should suggest fields (not WITH)', async () => {
    await rerankExpectSuggestions(
      'from a | rerank "query" on textField ',
      expectedFieldsForRerankOn
    );
  });

  test('after selecting a second field, suggest comma, expression, WITH and pipe again', async () => {
    await rerankExpectSuggestions('from a | rerank "query" on textField, keywordField', [
      'keywordField ',
    ]);
  });

  test('should suggest expression, WITH and PIPE keyword after fields', async () => {
    await rerankExpectSuggestions('from a | rerank "query" on textField ', [
      ', ',
      ' = ',
      'WITH { $0 }',
      '| ',
    ]);
  });

  test('WITH map suggests inference_id key', async () => {
    await rerankExpectSuggestions('from a | rerank "query" on textField WITH { ', [
      '"inference_id": "$0"',
    ]);
  });

  test('WITH value caret between quotes: no {} suggestion, endpoints shown if available', async () => {
    const before = 'from a | rerank "query" on textField WITH { "inference_id": "';
    const query = `${before}" }`;
    const offset = before.length;

    await rerankExpectSuggestions(query, ['inference_1'], mockCallbacks, mockContext, offset);
  });

  test('after complete WITH map, suggests only the pipe', async () => {
    await rerankExpectSuggestions(
      'from a | rerank "query" on textField WITH { "inference_id": "inference_1" } ',
      ['| ']
    );
  });
});
