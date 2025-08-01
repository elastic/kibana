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

const fuseExpectSuggestions = (
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
    'fuse',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('FUSE Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('suggests pipe after complete command', async () => {
    await fuseExpectSuggestions('FROM a | FORK (LIMIT 1) (LIMIT 2) | FUSE /', ['| ']);
  });
});
