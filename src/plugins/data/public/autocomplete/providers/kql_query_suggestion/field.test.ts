/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import indexPatternResponse from './__fixtures__/index_pattern_response.json';

import { setupGetFieldSuggestions } from './field';
import { indexPatterns as indexPatternsUtils, QuerySuggestionGetFnArgs, KueryNode } from '../../..';
import { coreMock } from '@kbn/core/public/mocks';

const mockKueryNode = (kueryNode: Partial<KueryNode>) => kueryNode as unknown as KueryNode;

describe('Kuery field suggestions', () => {
  let querySuggestionsArgs: QuerySuggestionGetFnArgs;
  let getSuggestions: ReturnType<typeof setupGetFieldSuggestions>;

  beforeEach(() => {
    querySuggestionsArgs = {
      indexPatterns: [indexPatternResponse],
    } as unknown as QuerySuggestionGetFnArgs;

    getSuggestions = setupGetFieldSuggestions(coreMock.createSetup());
  });

  test('should return a function', () => {
    expect(typeof getSuggestions).toBe('function');
  });

  test('should return filterable fields', async () => {
    const prefix = '';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );
    const filterableFields = indexPatternResponse.fields.filter(indexPatternsUtils.isFilterable);

    expect(suggestions.length).toBe(filterableFields.length);
  });

  test('should filter suggestions based on the query', async () => {
    const prefix = 'machine';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );

    expect(suggestions.find(({ text }) => text === 'machine.os ')).toBeDefined();
  });

  test('should filter suggestions case insensitively', async () => {
    const prefix = 'MACHINE';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );

    expect(suggestions.find(({ text }) => text === 'machine.os ')).toBeDefined();
  });

  test('should return suggestions where the query matches somewhere in the middle', async () => {
    const prefix = '.';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );

    expect(suggestions.find(({ text }) => text === 'machine.os ')).toBeDefined();
  });

  test('should field names that match the search', async () => {
    const prefix = 'machi';
    const suffix = 'ne.os';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );

    expect(suggestions.find(({ text }) => text === 'machine.os ')).toBeDefined();
  });

  test('should return field names that start with the query first', async () => {
    const prefix = 'e';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );
    const extensionIndex = suggestions.findIndex(({ text }) => text === 'extension ');
    const bytesIndex = suggestions.findIndex(({ text }) => text === 'bytes ');

    expect(extensionIndex).toBeLessThan(bytesIndex);
  });

  test('should sort keyword fields before analyzed versions', async () => {
    const prefix = '';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );
    const analyzedIndex = suggestions.findIndex(({ text }) => text === 'machine.os ');
    const keywordIndex = suggestions.findIndex(({ text }) => text === 'machine.os.raw ');

    expect(keywordIndex).toBeLessThan(analyzedIndex);
  });

  test('should not have descriptions', async () => {
    const prefix = '';
    const suffix = '';
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ prefix, suffix })
    );
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((suggestion) => {
      expect(suggestion).not.toHaveProperty('description');
    });
  });

  describe('nested fields', () => {
    test("should automatically wrap nested fields in KQL's nested syntax", async () => {
      const prefix = 'ch';
      const suffix = '';
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({ prefix, suffix })
      );

      const suggestion = suggestions.find(({ field }) => field.name === 'nestedField.child');

      expect(suggestion).toBeDefined();

      if (suggestion) {
        expect(suggestion.text).toBe('nestedField:{ child  }');

        // For most suggestions the cursor can be placed at the end of the suggestion text, but
        // for the nested field syntax we want to place the cursor inside the curly braces
        expect(suggestion.cursorIndex).toBe(20);
      }
    });

    test('should narrow suggestions to children of a nested path if provided', async () => {
      const prefix = 'ch';
      const suffix = '';

      const allSuggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({ prefix, suffix })
      );
      expect(allSuggestions.length).toBeGreaterThan(2);

      const nestedSuggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          prefix,
          suffix,
          nestedPath: 'nestedField',
        })
      );
      expect(nestedSuggestions).toHaveLength(2);
    });

    test("should not wrap the suggestion in KQL's nested syntax if the correct nested path is already provided", async () => {
      const prefix = 'ch';
      const suffix = '';

      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          prefix,
          suffix,
          nestedPath: 'nestedField',
        })
      );
      const suggestion = suggestions.find(({ field }) => field.name === 'nestedField.child');

      expect(suggestion).toBeDefined();

      if (suggestion) {
        expect(suggestion.text).toBe('child ');
      }
    });

    test('should handle fields nested multiple levels deep', async () => {
      const prefix = 'doubly';
      const suffix = '';

      const suggestionsWithNoPath = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({ prefix, suffix })
      );
      expect(suggestionsWithNoPath).toHaveLength(1);
      const [noPathSuggestion] = suggestionsWithNoPath;
      expect(noPathSuggestion.text).toBe('nestedField.nestedChild:{ doublyNestedChild  }');

      const suggestionsWithPartialPath = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          prefix,
          suffix,
          nestedPath: 'nestedField',
        })
      );
      expect(suggestionsWithPartialPath).toHaveLength(1);
      const [partialPathSuggestion] = suggestionsWithPartialPath;
      expect(partialPathSuggestion.text).toBe('nestedChild:{ doublyNestedChild  }');

      const suggestionsWithFullPath = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          prefix,
          suffix,
          nestedPath: 'nestedField.nestedChild',
        })
      );
      expect(suggestionsWithFullPath).toHaveLength(1);
      const [fullPathSuggestion] = suggestionsWithFullPath;
      expect(fullPathSuggestion.text).toBe('doublyNestedChild ');
    });
  });
});
