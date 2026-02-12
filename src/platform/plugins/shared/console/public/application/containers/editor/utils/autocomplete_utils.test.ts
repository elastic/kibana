/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Mock the function "populateContext" that accesses the autocomplete definitions
 */
import type { monaco } from '@kbn/monaco';

const mockPopulateContext = jest.fn();

jest.mock('../../../../lib/autocomplete/engine', () => {
  return {
    populateContext: (...args: any) => {
      mockPopulateContext(args);
    },
  };
});
import type { AutoCompleteContext, ResultTerm } from '../../../../lib/autocomplete/types';
import {
  getDocumentationLinkFromAutocomplete,
  getUrlPathCompletionItems,
  getBodyCompletionItems,
  shouldTriggerSuggestions,
  getInsertText,
} from './autocomplete_utils';

describe('autocomplete_utils', () => {
  describe('getDocumentationLinkFromAutocomplete', () => {
    const mockRequest = { method: 'GET', url: '_search', data: [] };
    const version = '8.13';
    const expectedLink = 'http://elastic.co/8.13/_search';

    it('correctly replaces {branch} with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/{branch}/_search',
      } as AutoCompleteContext['endpoint'];
      // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.endpoint = endpoint;
      });
      const link = getDocumentationLinkFromAutocomplete(mockRequest, version);
      expect(link).toBe(expectedLink);
    });

    it('correctly replaces /master/ with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/master/_search',
      } as AutoCompleteContext['endpoint'];
      // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.endpoint = endpoint;
      });
      const link = getDocumentationLinkFromAutocomplete(mockRequest, version);
      expect(link).toBe(expectedLink);
    });

    it('correctly replaces /current/ with the version', () => {
      const endpoint = {
        documentation: 'http://elastic.co/current/_search',
      } as AutoCompleteContext['endpoint'];
      // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.endpoint = endpoint;
      });
      const link = getDocumentationLinkFromAutocomplete(mockRequest, version);
      expect(link).toBe(expectedLink);
    });
  });

  describe('shouldTriggerSuggestions', () => {
    it('triggers suggestions for the beginning of the url after a method', () => {
      const actual = shouldTriggerSuggestions('GET ');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the url part', () => {
      const actual = shouldTriggerSuggestions('GET _search/');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the 2nd url part', () => {
      const actual = shouldTriggerSuggestions('GET _search/test1/');
      expect(actual).toBe(true);
    });
    it('triggers no suggestions for the url if not at the slash', () => {
      const actual = shouldTriggerSuggestions('GET _search');
      expect(actual).toBe(false);
    });
    it('triggers suggestions for the url params', () => {
      const actual = shouldTriggerSuggestions('GET _search?');
      expect(actual).toBe(true);
    });

    it('triggers no suggestions for the url params when the param name is typed', () => {
      const actual = shouldTriggerSuggestions('GET _search?test');
      expect(actual).toBe(false);
    });
    it('triggers suggestions for the url param value', () => {
      const actual = shouldTriggerSuggestions('GET _search?test=');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the url param value (index name with - and numbers)', () => {
      const actual = shouldTriggerSuggestions('GET .test-index-01/_search?test=');
      expect(actual).toBe(true);
    });
    it('triggers no suggestions for the url param value when the value is typed', () => {
      const actual = shouldTriggerSuggestions('GET _search?test=value');
      expect(actual).toBe(false);
    });
    it('triggers suggestions for the 2nd url param', () => {
      const actual = shouldTriggerSuggestions('GET _search?param1=value1&param2=');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the property name', () => {
      const actual = shouldTriggerSuggestions(' "');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the property name when the property name is typed', () => {
      const actual = shouldTriggerSuggestions('"propertyName');
      expect(actual).toBe(true);
    });
    it('triggers suggestions when typing a single character field name', () => {
      const actual = shouldTriggerSuggestions('"c');
      expect(actual).toBe(true);
    });
    it('triggers suggestions when typing a field name with dot', () => {
      const actual = shouldTriggerSuggestions('"category.');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for nested field names', () => {
      const actual = shouldTriggerSuggestions('"category.keyword');
      expect(actual).toBe(true);
    });
    it('triggers suggestions with whitespace before quote', () => {
      const actual = shouldTriggerSuggestions('  "field');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the property value', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": ');
      expect(actual).toBe(true);
    });
    it('triggers suggestions for the property value with a double quote', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": "');
      expect(actual).toBe(true);
    });
    it('triggers no suggestions for the property value when the value is typed (string)', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": "value');
      expect(actual).toBe(false);
    });
    it('triggers no suggestions for the property value when the value is typed (number)', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": 5');
      expect(actual).toBe(false);
    });
  });

  describe('getUrlPathCompletionItems', () => {
    beforeEach(() => {
      // mock autocomplete set with endpoints and index names
      const mockAutocompleteSet = [
        {
          name: '_cat',
        },
        {
          name: '_search',
        },
        {
          name: 'index1',
          meta: 'index',
        },
        {
          name: 'index2',
          meta: 'index',
        },
        {
          name: '.index',
          meta: 'index',
        },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];
      // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });
    });
    it('only suggests index items matching prefix if there is a comma at the end of the line', () => {
      const mockModel = {
        getValueInRange: () => 'GET .kibana,index',
        getWordUntilPosition: () => ({ startColumn: 13 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 18 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // Only index1 and index2 match 'index' prefix
      expect(items.length).toBe(2);
      expect(items.every((item) => item.detail === 'index')).toBe(true);
      expect(items.map((item) => item.label)).toEqual(['index1', 'index2']);
    });

    it('only suggests index items starting with comma-prefix when typing after comma', () => {
      const mockModel = {
        getValueInRange: () => 'GET .kibana,ind',
        getWordUntilPosition: () => ({ startColumn: 13 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 16 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // Should suggest index items matching 'ind' prefix
      expect(items.length).toBe(2);
      expect(items.every((item) => item.detail === 'index')).toBe(true);
    });

    it('suggest only endpoints matching prefix, excluding dot-prefixed ones, if no comma and no dot', () => {
      const mockModel = {
        getValueInRange: () => 'GET _search',
        getWordUntilPosition: () => ({ startColumn: 12 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 12 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // Only _search matches '_search' prefix
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('_search');
    });

    it('suggests endpoints and indices matching underscore prefix', () => {
      const mockModel = {
        getValueInRange: () => 'GET _',
        getWordUntilPosition: () => ({ startColumn: 5 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 6 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // _cat and _search should match '_' prefix
      expect(items.length).toBe(2);
      expect(items.map((item) => item.label).sort()).toEqual(['_cat', '_search']);
    });

    it('suggests all endpoints and indices, including dot-prefixed ones, if last char is a dot', () => {
      const mockModel = {
        getValueInRange: () => 'GET .',
        getWordUntilPosition: () => ({ startColumn: 6 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 6 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // Only .index matches '.' prefix
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('.index');
    });

    it('filters suggestions based on typed prefix after selecting an index', () => {
      // This tests the fix for the bug where typing a dot after selecting an index
      // would show all dot-prefixed indices instead of filtering by the full prefix
      const mockModel = {
        getValueInRange: () => 'GET .alerts-dataset.',
        getWordUntilPosition: () => ({ startColumn: 5 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 21 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // No indices start with '.alerts-dataset.' so should return empty
      expect(items.length).toBe(0);
    });

    it('excludes already selected indices from comma-separated suggestions', () => {
      const mockModel = {
        getValueInRange: () => 'GET index1,index2,',
        getWordUntilPosition: () => ({ startColumn: 19 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 19 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // index1 and index2 are already selected, so only .index should remain
      // (dot-prefixed indices are excluded when line doesn't end with dot)
      expect(items.length).toBe(0);
    });

    it('excludes already selected indices while filtering by prefix', () => {
      const mockModel = {
        getValueInRange: () => 'GET index1,ind',
        getWordUntilPosition: () => ({ startColumn: 12 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 15 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // index1 is already selected, so only index2 should match 'ind' prefix
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('index2');
    });

    it('calculates correct replacement range for partial token with dots', () => {
      const mockModel = {
        getValueInRange: () => 'GET .ind',
        getWordUntilPosition: () => ({ startColumn: 9 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 9 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      // The range should replace the entire '.ind' partial token
      // startColumn should be column (9) - partialToken.length (4) = 5
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('.index');
      expect(items[0].range).toEqual({
        startLineNumber: 1,
        startColumn: 5,
        endLineNumber: 1,
        endColumn: 9,
      });
    });
  });

  describe('getBodyCompletionItems', () => {
    const mockEditor = {} as any;

    beforeEach(() => {
      // Reset mock before each test
      mockPopulateContext.mockReset();
    });

    it('calculates correct replacement range for unquoted fields with dots', async () => {
      // Mock autocomplete suggestions
      const mockAutocompleteSet = [
        { name: 'index.mode', template: 'standard' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });

      // Simulate typing "index.mode" without quotes in the body
      // Line content: "        index.mode"
      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: any) => {
          // Body content before position
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        index.mode';
          }
          // Line content before position (current line)
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        index.mode';
          }
          // Line content after position
          return '';
        }),
        getWordUntilPosition: () => ({ startColumn: 15, word: 'mode' }), // Only "mode" is detected as word
        getLineMaxColumn: () => 19,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 4, column: 19 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      // The range should cover "index.mode" (columns 9-19), not just "mode" (columns 15-19)
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('index.mode');
      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: 9, // Should start at "index", not "mode"
        endLineNumber: 4,
        endColumn: 19,
      });
    });

    it('calculates correct replacement range for quoted fields with dots', async () => {
      const mockAutocompleteSet = [
        { name: 'index.mode', template: 'standard' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });

      // Simulate typing "index.mode" with quotes in the body
      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: any) => {
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        "index.mode';
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        "index.mode';
          }
          return '"'; // closing quote after cursor
        }),
        getWordUntilPosition: () => ({ startColumn: 16, word: 'mode' }),
        getLineMaxColumn: () => 21,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 4, column: 20 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items.length).toBe(1);
      expect(items[0].label).toBe('index.mode');
      // Range should cover "index.mode" (after the opening quote) and include closing quote
      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: 10, // After the opening quote
        endLineNumber: 4,
        endColumn: 21, // Including the closing quote
      });
    });
  });

  describe('getInsertText', () => {
    const mockContext = { addTemplate: false } as AutoCompleteContext;

    it('returns empty string if name is undefined', () => {
      expect(getInsertText({ name: undefined } as ResultTerm, '', mockContext)).toBe('');
    });

    it('handles unclosed quotes correctly', () => {
      expect(
        getInsertText(
          { name: 'match_all' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      "match_a',
          mockContext
        )
      ).toBe('match_all"');
    });

    it('wraps insertValue with quotes when appropriate', () => {
      expect(
        getInsertText(
          { name: 'match_all' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      ',
          mockContext
        )
      ).toBe('"match_all"');
    });

    it('appends template when available and context.addTemplate is true', () => {
      expect(
        getInsertText({ name: 'query', template: {} } as ResultTerm, '{\n' + '    ', {
          ...mockContext,
          addTemplate: true,
        })
      ).toBe('"query": {$0}');
    });

    it('inserts template when provided directly and context.addTemplate is true', () => {
      expect(
        getInsertText(
          { name: 'terms', template: { field: '' } },
          '{\n' + '    "aggs": {\n' + '      "NAME": {\n' + '        "',
          { ...mockContext, addTemplate: true }
        )
      ).toBe('terms": {\n' + '  "field": ""\n' + '}');
    });

    it('inserts only field name when template is provided and context.addTemplate is false', () => {
      expect(
        getInsertText(
          { name: 'terms', template: { field: '' } },
          '{\n' + '    "aggs": {\n' + '      "NAME": {\n' + '        "',
          mockContext
        )
      ).toBe('terms"');
    });

    it('inserts template inline', () => {
      expect(
        getInsertText({ name: 'term', template: { FIELD: { value: 'VALUE' } } }, '{"query": {te', {
          ...mockContext,
          addTemplate: true,
        })
      ).toBe('"term": {\n' + '  "FIELD": {\n' + '    "value": "VALUE"\n' + '  }\n' + '}');
    });

    it('adds cursor placeholder inside empty objects and arrays', () => {
      expect(getInsertText({ name: 'field', value: '{' } as ResultTerm, '', mockContext)).toBe(
        '"field": {$0}'
      );
      expect(getInsertText({ name: 'field', value: '[' } as ResultTerm, '', mockContext)).toBe(
        '"field": [$0]'
      );
    });
  });
});
