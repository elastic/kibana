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
  type MockedICommandCallbacks,
} from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, suggest } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';
import {
  comparisonFunctions,
  patternMatchOperators,
  inOperators,
  nullCheckOperators,
} from '../../definitions/all_operators';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

type ExpectedSuggestions = string[] | { contains?: string[]; notContains?: string[] };

const joinExpectSuggestions = async (
  query: string,
  expected: ExpectedSuggestions,
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
): Promise<void> => {
  if (Array.isArray(expected)) {
    return expectSuggestions(query, expected, context, 'join', mockCallbacks, autocomplete, offset);
  }

  const results = await suggest(query, context, 'join', mockCallbacks, autocomplete, offset);
  const texts = results.map(({ text }) => text);

  if (expected.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.contains));
  }

  if (expected.notContains?.length) {
    expect(texts).not.toEqual(expect.arrayContaining(expected.notContains));
  }
};

describe('JOIN Autocomplete', () => {
  let mockCallbacks: MockedICommandCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });
  describe('<type> JOIN ...', () => {
    test('suggests command on first character', async () => {
      const suggestions = await suggest(
        'FROM index | LOOKUP J',
        mockContext,
        'join',
        mockCallbacks,
        autocomplete
      );
      const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

      expect(filtered[0].label).toBe('LOOKUP JOIN');
    });

    test('returns command description, correct type, and suggestion continuation', async () => {
      const suggestions = await suggest(
        'FROM index | LOOKUP J',
        mockContext,
        'join',
        mockCallbacks,
        autocomplete
      );

      expect(suggestions[0]).toMatchObject({
        label: 'LOOKUP JOIN',
        text: 'LOOKUP JOIN $0',
        detail: 'Join with a "lookup" mode index',
        kind: 'Keyword',
      });
    });
  });

  describe('... <index> ...', () => {
    test('can suggest lookup indices (and aliases), and a create index command', async () => {
      const suggestions = await suggest(
        'FROM index | LEFT JOIN ',
        mockContext,
        'join',
        mockCallbacks,
        autocomplete
      );
      const labels = suggestions.map(({ label }) => label);

      expect(labels).toEqual([
        'Create lookup index',
        'join_index',
        'join_index_with_alias',
        'lookup_index',
        'join_index_alias_1',
        'join_index_alias_2',
      ]);

      const createIndexCommandSuggestion = suggestions.find(
        (s) => s.label === 'Create lookup index'
      );

      expect(createIndexCommandSuggestion).toEqual({
        category: SuggestionCategory.CUSTOM_ACTION,
        command: {
          arguments: [{ indexName: '' }],
          id: 'esql.lookup_index.create',
          title: 'Click to create',
        },
        detail: 'Click to create',
        filterText: '',
        incomplete: true,
        kind: 'Issue',
        label: 'Create lookup index',
        sortText: '0',
        text: '',
      });
    });

    test('can suggest indeces based on a fragment', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_',
        {
          contains: [
            'join_',
            'join_index ',
            'join_index_with_alias ',
            'lookup_index ',
            'join_index_alias_1 $0',
            'join_index_alias_2 $0',
          ],
        },
        mockCallbacks
      );
    });

    test('does not suggest the create index command when the index already exists', async () => {
      await joinExpectSuggestions(
        'FROM index | LEFT JOIN join_index',
        { notContains: ['Create lookup index join_index'] },
        mockCallbacks
      );
    });

    test('does not suggest the create index command when the index already exists as an alias', async () => {
      await joinExpectSuggestions(
        'FROM index | LEFT JOIN join_index_alias_1',
        { notContains: ['Create lookup index join_index_alias_1'] },
        mockCallbacks
      );
    });

    test('does not suggest the create index command when a user does not have required privileges', async () => {
      (mockCallbacks.canCreateLookupIndex as jest.Mock).mockResolvedValueOnce(false);
      await joinExpectSuggestions(
        'FROM index | LEFT JOIN ',
        { notContains: ['Create lookup index'] },
        mockCallbacks
      );
    });

    test('suggests create index command with the user input', async () => {
      const suggestions = await suggest(
        'FROM index | LEFT JOIN new_join_index',
        mockContext,
        'join',
        mockCallbacks,
        autocomplete
      );

      const createIndexCommandSuggestion = suggestions.find(
        (s) => s.label === 'Create lookup index "new_join_index"'
      );

      expect(createIndexCommandSuggestion).toEqual({
        category: SuggestionCategory.CUSTOM_ACTION,
        command: {
          arguments: [{ indexName: 'new_join_index' }],
          id: 'esql.lookup_index.create',
          title: 'Click to create',
        },
        detail: 'Click to create',
        filterText: 'new_join_index',
        incomplete: true,
        kind: 'Issue',
        label: 'Create lookup index "new_join_index"',
        rangeToReplace: {
          end: 37,
          start: 23,
        },
        sortText: '0',
        text: 'new_join_index',
      });
    });

    test('discriminates between indices and aliases', async () => {
      const suggestions = await suggest(
        'FROM index | LEFT JOIN ',
        mockContext,
        'join',
        mockCallbacks,
        autocomplete
      );
      const indices: string[] = suggestions
        .filter((s) => s.detail === 'Index')
        .map(({ label }) => label)
        .sort();
      const aliases: string[] = suggestions
        .filter((s) => s.detail === 'Alias')
        .map(({ label }) => label)
        .sort();

      expect(indices).toEqual(['join_index', 'join_index_with_alias', 'lookup_index']);
      expect(aliases).toEqual(['join_index_alias_1', 'join_index_alias_2']);
    });
  });

  describe('... ON <condition>', () => {
    // Helper to add placeholder to operator labels for test expectations
    const addPlaceholder = (operators: string[]) => operators.map((op) => `${op} $0`);

    test('shows "ON" keyword suggestion', async () => {
      await joinExpectSuggestions('FROM index | LOOKUP JOIN join_index ', ['ON '], mockCallbacks);
    });

    test('suggests fields and functions after ON keyword', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON ',
        {
          contains: [
            'textField',
            'keywordField',
            'booleanField',
            'joinIndexOnlyField ',
            'STARTS_WITH($0)',
            'CONTAINS($0)',
          ],
        },
        mockCallbacks
      );
    });

    test('suggests fields after comma', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON textField, ',
        { contains: ['keywordField'] },
        mockCallbacks
      );
    });

    test('suggests fields with field prefix', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON keyw',
        { contains: ['keywordField'] },
        mockCallbacks
      );
    });

    test('suggests fields after comparison operator', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON textField == ',
        { contains: ['keywordField'] },
        mockCallbacks
      );
    });

    test('suggests fields after AND operator', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON textField == "value" AND ',
        { contains: ['keywordField'] },
        mockCallbacks
      );
    });

    test('suggests fields after comma in second condition', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON textField == "value", ',
        { contains: ['keywordField'] },
        mockCallbacks
      );
    });

    test('suggests boolean operators after IS NULL', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON textField IS NULL ',
        { contains: ['AND $0', 'OR $0', ', ', '| '] },
        mockCallbacks
      );
    });

    describe('boolean operators and functions from PR #136104', () => {
      test('suggests all boolean operators after field', async () => {
        const expectedOperators = [
          ...addPlaceholder([
            ...comparisonFunctions.map(({ name }) => name.toUpperCase()),
            ...patternMatchOperators.map(({ name }) => name.toUpperCase()),
            ...inOperators.map(({ name }) => name.toUpperCase()),
          ]),
          // IS NULL and IS NOT NULL don't have placeholders because they don't take parameters
          ...nullCheckOperators.map(({ name }) => name.toUpperCase()),
        ];

        await joinExpectSuggestions(
          'FROM index | LOOKUP JOIN join_index ON keywordField ',
          { contains: expectedOperators },
          mockCallbacks
        );
      });

      test('suggests full-text search functions', async () => {
        await joinExpectSuggestions(
          'FROM index | LOOKUP JOIN join_index ON keywordField == "value" AND ',
          { contains: ['MATCH($0)', 'MULTI_MATCH($0)', 'QSTR("""$0""")'] },
          mockCallbacks
        );
      });

      test('suggests logical operators, comma and pipe after complete expression', async () => {
        await joinExpectSuggestions(
          'FROM index | LOOKUP JOIN join_index ON keywordField == "value" ',
          { contains: [...addPlaceholder(['AND', 'OR']), ', ', '| '] },
          mockCallbacks
        );
      });

      test('suggests fields after comma for multiple conditions', async () => {
        await joinExpectSuggestions(
          'FROM index | LOOKUP JOIN join_index ON keywordField == "value", ',
          { contains: ['booleanField'] },
          mockCallbacks
        );
      });
    });
  });
});
