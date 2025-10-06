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
  suggest,
} from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import { Location } from '../../types';

const expectedFieldSuggestions = getFieldNamesByType('any');
const expectedFunctionSuggestions = getFunctionSignaturesByReturnType(Location.SORT, 'any', {
  scalar: true,
});
const expressionOperatorSuggestions = getFunctionSignaturesByReturnType(
  Location.SORT,
  'any',
  {
    operators: true,
  },
  ['keyword']
);

interface SuggestionItem {
  text: string;
  [key: string]: unknown;
}

type ExpectedSort =
  | string[]
  | {
      contains?: string[];
      notContains?: string[];
      containsItems?: SuggestionItem[];
      hasAny?: boolean;
    };

const sortExpectSuggestions = async (
  query: string,
  expected: ExpectedSort,
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  if (Array.isArray(expected)) {
    return expectSuggestions(query, expected, context, 'sort', mockCallbacks, autocomplete);
  }
  const results = await suggest(query, context, 'sort', mockCallbacks, autocomplete);
  const texts = results.map(({ text }) => text);

  if (expected.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.contains));
  }

  if (expected.notContains?.length) {
    expected.notContains.forEach((excludedText) => expect(texts).not.toContain(excludedText));
  }

  if (expected.containsItems?.length) {
    expect(results).toEqual(expect.arrayContaining(expected.containsItems));
  }

  if (expected.hasAny) {
    expect(results.length).toBeGreaterThan(0);
  }
};

describe('SORT Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // @TODO — test for replacement ranges when we support that.
  // test for replacement range in NULLS FIRST/LAST in all possible positions
  //  including after whitespace... test that replacement range gets added to all suggestions
  //  and IS NULL/IS NOT NULL scenarios
  //  and after a field name starting with an N
  // test for comma replacement range after whitespace

  describe('SORT <expression> ...', () => {
    test('suggests column', async () => {
      await sortExpectSuggestions('from a | sort ', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keyw', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField, ', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField, doubl', [
        ...expectedFieldSuggestions,
        ...expectedFunctionSuggestions,
      ]);
    });

    it('suggests modifers after complete column name', async () => {
      await sortExpectSuggestions('from a | sort keywordField', [
        'keywordField, ',
        'keywordField | ',
        'keywordField ASC',
        'keywordField DESC',
        'keywordField NULLS FIRST',
        'keywordField NULLS LAST',
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

    it('suggests modifers and expression operators after column + whitespace', async () => {
      await sortExpectSuggestions('from a | sort keywordField ', [
        ', ',
        '| ',
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ...expressionOperatorSuggestions,
      ]);

      await sortExpectSuggestions('from a | sort doubleField ASC, keywordField ', [
        ', ',
        '| ',
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ...expressionOperatorSuggestions,
      ]);
    });

    it('suggests within functions', async () => {
      await sortExpectSuggestions('FROM a | SORT TRIM(', { hasAny: true });
    });
  });

  describe('... [ ASC / DESC ] ...', () => {
    test('suggests all modifiers on first space', async () => {
      await sortExpectSuggestions('from a | sort keywordField ', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
    });

    test('when user starts to type ASC modifier', async () => {
      await sortExpectSuggestions('from a | sort keywordField A', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField ASC', [
        'ASC NULLS FIRST',
        'ASC NULLS LAST',
        'ASC, ',
        'ASC | ',
      ]);
      await sortExpectSuggestions('from a | sort keywordField asc', [
        'asc NULLS FIRST',
        'asc NULLS LAST',
        'asc, ',
        'asc | ',
      ]);
    });

    test('when user starts to type DESC modifier', async () => {
      await sortExpectSuggestions('from a | sort keywordField D', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField DESC ', [
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
      ]);
      await sortExpectSuggestions('from a | sort keywordField desc', [
        'desc NULLS FIRST',
        'desc NULLS LAST',
        'desc, ',
        'desc | ',
      ]);
    });
  });

  describe('... [ NULLS FIRST / NULLS LAST ]', () => {
    test('suggests nulls modifier after order modifier + space', async () => {
      await sortExpectSuggestions('from a | sort keywordField ASC ', [
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
      ]);
    });

    test('when user starts to type NULLS modifiers', async () => {
      // @TODO check for replacement range
      await sortExpectSuggestions('from a | sort keywordField N', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField null', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField nulls', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField nulls ', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
    });

    test('when user types NULLS FIRST', async () => {
      await sortExpectSuggestions('from a | sort keywordField NULLS F', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField NULLS FI', [
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
    });

    test('when user types NULLS LAST', async () => {
      await sortExpectSuggestions('from a | sort keywordField NULLS L', [
        'ASC',
        'DESC',
        'NULLS LAST',
        'NULLS FIRST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
      await sortExpectSuggestions('from a | sort keywordField NULLS LAS', [
        'ASC',
        'DESC',
        'NULLS LAST',
        'NULLS FIRST',
        ', ',
        '| ',
        ...expressionOperatorSuggestions,
      ]);
    });

    test('after nulls are entered, suggests comma or pipe', async () => {
      await sortExpectSuggestions('from a | sort keywordField NULLS LAST ', [', ', '| ']);
    });
  });

  describe('boolean expressions (grammar-based)', () => {
    test('IS NULL / IS NOT NULL suggestions', async () => {
      await sortExpectSuggestions('from a | sort keywordField IS ', {
        contains: ['IS NULL', 'IS NOT NULL'],
      });
    });

    test('suggestions after IN operator', async () => {
      await sortExpectSuggestions('from a | sort doubleField IN ', ['( $0 )']);
      await sortExpectSuggestions('from a | sort doubleField NOT IN ', ['( $0 )']);
    });

    test('function call within sort expression', async () => {
      await sortExpectSuggestions('from a | sort ROUND(doubleField, ', { hasAny: true });
    });

    test('operators after complete IN expression', async () => {
      await sortExpectSuggestions('from a | sort doubleField IN (1.0, 2.0) ', [
        'AND $0',
        'OR $0',
        ', ',
        '| ',
        'ASC',
        'DESC',
        'NULLS FIRST',
        'NULLS LAST',
      ]);
    });

    test('pattern matching operators (LIKE/RLIKE)', async () => {
      await sortExpectSuggestions('from a | sort textField LIKE ', { hasAny: true });
    });

    test('complex nested expressions', async () => {
      await sortExpectSuggestions(
        'from a | sort (ROUND(doubleField) > 5 AND textField LIKE "test") ',
        ['AND $0', 'OR $0', ', ', '| ', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST']
      );
    });
  });

  describe('Replacement ranges for NULLS and operators', () => {
    test('replacement range for NULLS suggestions after partial prefix', async () => {
      const query = 'from a | sort keywordField ASC NULLS F';

      const suggestions = await suggest(query, mockContext, 'sort', undefined, autocomplete);
      const { length } = query;

      const nullsFirst = suggestions.find(({ text }) => text === 'NULLS FIRST');
      const nullsLast = suggestions.find(({ text }) => text === 'NULLS LAST');

      expect(nullsFirst?.rangeToReplace).toEqual({ start: length - 7, end: length });
      expect(nullsLast?.rangeToReplace).toEqual({ start: length - 7, end: length });
    });
  });
});
