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

const renameExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'rename',
    mockCallbacks,
    autocomplete
  );
};

describe('RENAME Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = {
      getByType: jest.fn(),
    };

    const expectedFields = getFieldNamesByType('any');
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
  });

  it('suggests fields', async () => {
    const expectedSuggestions = [' = ', ...getFieldNamesByType('any')];
    await renameExpectSuggestions('from a | rename ', expectedSuggestions, mockCallbacks);
    await renameExpectSuggestions('from a | rename fie', expectedSuggestions, mockCallbacks);
    await renameExpectSuggestions(
      'from a | rename field AS foo,',
      [...expectedSuggestions, ' = '],
      mockCallbacks
    );
    await renameExpectSuggestions(
      'from a | rename field = foo, ',
      expectedSuggestions,
      mockCallbacks
    );
    await renameExpectSuggestions(
      'from a | rename field AS foo, fie',
      expectedSuggestions,
      mockCallbacks
    );
    await renameExpectSuggestions(
      'from a | rename field = foo, fie',
      expectedSuggestions,
      mockCallbacks
    );
  });

  it('suggests AS after an existing field', async () => {
    await renameExpectSuggestions('from a | rename textField ', ['AS '], mockCallbacks);
    await renameExpectSuggestions(
      'from a | rename keywordField AS foo, textField ',
      ['AS '],
      mockCallbacks
    );
    await renameExpectSuggestions(
      'from a | rename keywordField as foo , textField ',
      ['AS '],
      mockCallbacks
    );
  });

  it('suggests = after a field that does not exist', async () => {
    await renameExpectSuggestions('from a | rename field ', ['= '], mockCallbacks);
    await renameExpectSuggestions(
      'from a | rename keywordField AS foo, field ',
      ['= '],
      mockCallbacks
    );
    await renameExpectSuggestions(
      'from a | rename keywordField as foo , field ',
      ['= '],
      mockCallbacks
    );
  });

  it('suggests nothing after AS', async () => {
    await renameExpectSuggestions('from a | rename keywordField AS ', [], mockCallbacks);
  });

  it('suggests fields after =', async () => {
    await renameExpectSuggestions(
      'from a | rename field = ',
      getFieldNamesByType('any'),
      mockCallbacks
    );
  });

  it('suggests pipe and comma after complete expression', async () => {
    await renameExpectSuggestions('from a | rename field AS foo ', ['| ', ', '], mockCallbacks);
  });
});
