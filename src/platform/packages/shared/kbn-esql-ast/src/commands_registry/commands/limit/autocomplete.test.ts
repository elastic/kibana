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
import { expectSuggestions } from '../../../__tests__/autocomplete';
import { ICommandCallbacks } from '../../types';

const limitExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'limit',
    mockCallbacks,
    autocomplete
  );
};

describe('LIMIT Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LIMIT <number>', () => {
    test('suggests numbers', async () => {
      limitExpectSuggestions('from a | limit /', ['10 ', '100 ', '1000 ']);
    });

    test('suggests pipe after number', async () => {
      limitExpectSuggestions('from a | limit 4 ', ['| ']);
    });
  });
});
