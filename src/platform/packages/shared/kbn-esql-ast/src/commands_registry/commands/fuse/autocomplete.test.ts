/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, getMockCallbacks } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import { ESQL_NUMBER_TYPES } from '../../../definitions/types';

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

  describe('FUSE arguments', () => {
    it('suggests all FUSE arguments + FUSE types if FUSE has no arguments', async () => {
      await fuseExpectSuggestions('FROM a | FUSE /', [
        'linear ',
        'rrf ',
        'SCORE BY ',
        'KEY BY ',
        'GROUP BY ',
        'WITH ',
        '| ',
      ]);
    });

    it('does not suggest FUSE types if FUSE already has one', async () => {
      await fuseExpectSuggestions('FROM a | FUSE linear /', [
        'SCORE BY ',
        'KEY BY ',
        'GROUP BY ',
        'WITH ',
        '| ',
      ]);
    });

    it('does not suggest already used arguments', async () => {
      await fuseExpectSuggestions('FROM a | FUSE linear SCORE BY x KEY BY y /', [
        'GROUP BY ',
        'WITH ',
        '| ',
      ]);
    });

    it('does not suggest FUSE type if another argument has been added', async () => {
      await fuseExpectSuggestions('FROM a | FUSE SCORE BY x /', [
        'KEY BY ',
        'GROUP BY ',
        'WITH ',
        '| ',
      ]);
    });
  });

  describe('SCORE BY', () => {
    it('suggests numeric fields after SCORE BY', async () => {
      const expectedNumericFields = getFieldNamesByType(ESQL_NUMBER_TYPES);
      const mockCallbacks = getMockCallbacks();
      (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
        expectedNumericFields.map((name) => ({ label: name, text: name }))
      );
      await fuseExpectSuggestions(
        'FROM a | FUSE linear SCORE BY /',
        expectedNumericFields,
        mockCallbacks
      );
    });
  });
});
