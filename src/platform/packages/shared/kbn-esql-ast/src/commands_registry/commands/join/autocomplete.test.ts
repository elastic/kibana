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
} from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import type { ICommandCallbacks, ICommandContext } from '../../types';
import { correctQuerySyntax, findAstPosition } from '../../../definitions/utils/ast';
import { parse } from '../../../parser';
import { uniq } from 'lodash';

const joinExpectSuggestions = (
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
    'join',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('JOIN Autocomplete', () => {
  let mockCallbacks: MockedICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks before each test to ensure isolation
    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  const suggest = async (query: string, contextOverrides: Partial<ICommandContext> = {}) => {
    const correctedQuery = correctQuerySyntax(query);
    const { ast } = parse(correctedQuery, { withFormatting: true });
    const cursorPosition = query.length;
    const { command } = findAstPosition(ast, cursorPosition);
    if (!command) {
      throw new Error('Command not found in the parsed query');
    }

    return autocomplete(
      query,
      command,
      mockCallbacks,
      { ...mockContext, ...contextOverrides },
      cursorPosition
    );
  };
  describe('<type> JOIN ...', () => {
    test('suggests command on first character', async () => {
      const suggestions = await suggest('FROM index | LOOKUP J');
      const filtered = suggestions.filter((s) => s.label.toUpperCase() === 'LOOKUP JOIN');

      expect(filtered[0].label).toBe('LOOKUP JOIN');
    });

    test('returns command description, correct type, and suggestion continuation', async () => {
      const suggestions = await suggest('FROM index | LOOKUP J');

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
      const suggestions = await suggest('FROM index | LEFT JOIN ');
      const labels = suggestions.map((s) => s.label);

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
        command: {
          arguments: [{ indexName: '' }],
          id: 'esql.lookup_index.create',
          title: 'Click to create',
        },
        detail: 'Click to create',
        filterText: '',
        kind: 'Issue',
        label: 'Create lookup index',
        sortText: '1A',
        text: '',
      });
    });

    test('does not suggest the create index command when the index already exists', async () => {
      const suggestions = await suggest('FROM index | LEFT JOIN join_index');
      const labels = suggestions.map((s) => s.label);

      expect(labels).not.toContain('Create lookup index join_index');
    });

    test('does not suggest the create index command when the index already exists as an alias', async () => {
      const suggestions = await suggest('FROM index | LEFT JOIN join_index_alias_1');
      const labels = suggestions.map((s) => s.label);

      expect(labels).not.toContain('Create lookup index join_index_alias_1');
    });

    test('does not suggest the create index command when a user does not have required privileges', async () => {
      (mockCallbacks.canCreateLookupIndex as jest.Mock).mockResolvedValueOnce(false);
      const suggestions = await suggest('FROM index | LEFT JOIN ');
      const labels = suggestions.map((s) => s.label);

      expect(labels).not.toContain('Create lookup index');
    });

    test('suggests create index command with the user input', async () => {
      const suggestions = await suggest('FROM index | LEFT JOIN new_join_index');

      const createIndexCommandSuggestion = suggestions.find(
        (s) => s.label === 'Create lookup index "new_join_index"'
      );

      expect(createIndexCommandSuggestion).toEqual({
        command: {
          arguments: [{ indexName: 'new_join_index' }],
          id: 'esql.lookup_index.create',
          title: 'Click to create',
        },
        detail: 'Click to create',
        filterText: 'new_join_index',
        kind: 'Issue',
        label: 'Create lookup index "new_join_index"',
        rangeToReplace: {
          end: 37,
          start: 23,
        },
        sortText: '1A',
        text: 'new_join_index',
      });
    });

    test('discriminates between indices and aliases', async () => {
      const suggestions = await suggest('FROM index | LEFT JOIN ');
      const indices: string[] = suggestions
        .filter((s) => s.detail === 'Index')
        .map((s) => s.label)
        .sort();
      const aliases: string[] = suggestions
        .filter((s) => s.detail === 'Alias')
        .map((s) => s.label)
        .sort();

      expect(indices).toEqual(['join_index', 'join_index_with_alias', 'lookup_index']);
      expect(aliases).toEqual(['join_index_alias_1', 'join_index_alias_2']);
    });
  });

  describe('... ON <condition>', () => {
    test('shows "ON" keyword suggestion', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ');
      const labels = suggestions.map((s) => s.label);

      expect(labels).toEqual(['ON']);
    });

    test('suggests fields after ON keyword', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON ');
      const labels = suggestions.map((s) => s.text.trim()).sort();
      const expected = getFieldNamesByType('any')
        .sort()
        .map((field) => field.trim());

      for (const { name } of lookupIndexFields) {
        expected.push(name.trim());
      }

      expected.sort();

      expect(labels).toEqual(uniq(expected));
    });

    test('more field suggestions after comma', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON stringField, ');
      const labels = suggestions.map((s) => s.text.trim()).sort();
      const expected = getFieldNamesByType('any')
        .sort()
        .map((field) => field.trim());

      for (const { name } of lookupIndexFields) {
        expected.push(name.trim());
      }

      expected.sort();

      expect(labels).toEqual(uniq(expected));
    });

    test('supports field prefixes', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON keyw');
      const labels = suggestions.map((s) => s.text.trim()).sort();
      const expected = getFieldNamesByType('any')
        .sort()
        .map((field) => field.trim());

      for (const { name } of lookupIndexFields) {
        expected.push(name.trim());
      }

      expected.sort();

      expect(labels).toEqual(uniq(expected));
    });

    test('suggests comma and pipe on complete field name', async () => {
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON keywordField',
        ['keywordField, ', 'keywordField | '],
        mockCallbacks
      );

      // recognizes a complete join index field too
      await joinExpectSuggestions(
        'FROM index | LOOKUP JOIN join_index ON joinIndexOnlyField',
        ['joinIndexOnlyField, ', 'joinIndexOnlyField | '],
        mockCallbacks
      );
    });

    test('suggests pipe and comma after a field', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON stringField ');
      const labels = suggestions.map((s) => s.label).sort();

      expect(labels).toEqual([',', '|']);
    });

    test('suggests pipe and comma after a field (no space)', async () => {
      const suggestions = await suggest('FROM index | LOOKUP JOIN join_index ON keywordField');
      const labels = suggestions.map((s) => s.text).sort();

      expect(labels).toEqual(['keywordField | ', 'keywordField, ']);
    });
  });
});
