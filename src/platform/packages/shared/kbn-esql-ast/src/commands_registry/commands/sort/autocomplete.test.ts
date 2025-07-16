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
import {
  expectSuggestions,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
} from '../../../__tests__/autocomplete';
import { ICommandCallbacks, Location } from '../../types';

const expectedFieldSuggestions = getFieldNamesByType('any');
const expectedFunctionSuggestions = getFunctionSignaturesByReturnType(Location.SORT, 'any', {
  scalar: true,
});

export const EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS = [
  ...expectedFieldSuggestions,
  ...expectedFunctionSuggestions,
];

const sortExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'sort',
    mockCallbacks,
    autocomplete
  );
};

describe('SORT Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TODO
  // test for replacement range in NULLS FIRST/LAST in all possible positions
  //  including after whitespace... test that replacement range gets added to all suggestions
  // test for suggestions right after a column name
  // test for comma replacement range after whitespace

  describe('SORT <column> ...', () => {
    test('suggests column', async () => {
      await sortExpectSuggestions('from a | sort ', EXPECTED_FIELD_AND_FUNCTION_SUGGESTIONS);
      await sortExpectSuggestions('from a | sort keyw', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField ', [
        ', ',
        '| ',
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
    });
    it('suggests subsequent column after comma', async () => {
      await sortExpectSuggestions('from a | sort keywordField, ', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField, doubl', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField, doubleField', [
        'doubleField, ',
        'doubleField | ',
        'doubleField ASC',
        'doubleField DESC',
        'doubleField NULLS FIRST',
        'doubleField NULLS LAST',
      ]);
    });
  });

  describe('... [ ASC / DESC ] ...', () => {
    test('suggests all modifiers on first space', async () => {
      await sortExpectSuggestions('from a | sort stringField ', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
      ]);
    });

    test('when user starts to type ASC modifier', async () => {
      await sortExpectSuggestions('from a | sort stringField A', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField ASC', [
        'ASC NULLS FIRST',
        'ASC NULLS LAST',
        'ASC, ',
        'ASC | ',
      ]);
      await sortExpectSuggestions('from a | sort stringField asc', [
        'asc NULLS FIRST',
        'asc NULLS LAST',
        'asc, ',
        'asc | ',
      ]);
    });

    test('when user starts to type DESC modifier', async () => {
      await sortExpectSuggestions('from a | sort stringField D', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField DESC ', [
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
      ]);
      await sortExpectSuggestions('from a | sort stringField desc', [
        'desc NULLS FIRST',
        'desc NULLS LAST',
        'desc, ',
        'desc | ',
      ]);
    });
  });

  describe('... [ NULLS FIRST / NULLS LAST ]', () => {
    test('suggests nulls modifier after order modifier + space', async () => {
      await sortExpectSuggestions('from a | sort stringField ASC ', [
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
      ]);
    });

    test('when user starts to type NULLS modifiers', async () => {
      // @TODO check for replacement range
      await sortExpectSuggestions('from a | sort stringField N/', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField null/', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField nulls/', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField nulls /', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
    });

    test('when user types NULLS FIRST', async () => {
      await sortExpectSuggestions('from a | sort stringField NULLS F', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
      await sortExpectSuggestions('from a | sort stringField NULLS FI', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
    });

    test('when user types NULLS LAST', async () => {
      await sortExpectSuggestions('from a | sort stringField NULLS L', [
        'ASC',
        'DESC',
        'NULLS LAST',
        'NULLS FIRST',
      ]);
      await sortExpectSuggestions('from a | sort stringField NULLS LAS', [
        'ASC',
        'DESC',
        'NULLS LAST',
        'NULLS FIRST',
      ]);
    });

    test('after nulls are entered, suggests comma or pipe', async () => {
      await sortExpectSuggestions('from a | sort stringField NULLS LAST /', [', ', '| ']);
    });
  });
});
