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
import { monaco } from '@kbn/monaco';
import { MonacoEditorActionsProvider } from '../monaco_editor_actions_provider';

const mockPopulateContext = jest.fn();

jest.mock('../../../../lib/autocomplete/engine', () => {
  return {
    populateContext: (...args: any) => {
      mockPopulateContext(args);
    },
  };
});
import { AutoCompleteContext } from '../../../../lib/autocomplete/types';
import {
  getDocumentationLinkFromAutocomplete,
  getUrlPathCompletionItems,
  shouldTriggerSuggestions,
  getBodyCompletionItems,
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
    it('triggers no suggestions for the property name when the property name is typed', () => {
      const actual = shouldTriggerSuggestions('"propertyName');
      expect(actual).toBe(false);
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
      ] as AutoCompleteContext['autoCompleteSet'];
      // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });
    });
    it('only suggests index items if there is a comma at the end of the line', () => {
      const mockModel = {
        getValueInRange: () => 'GET .kibana,',
        getWordUntilPosition: () => ({ startColumn: 13 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 13 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      expect(items.length).toBe(2);
      expect(items.every((item) => item.detail === 'index')).toBe(true);
    });

    it('only suggests index items if there is a comma in the last url path token', () => {
      const mockModel = {
        getValueInRange: () => 'GET .kibana,index',
        getWordUntilPosition: () => ({ startColumn: 13 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 18 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      expect(items.length).toBe(2);
      expect(items.every((item) => item.detail === 'index')).toBe(true);
    });

    it('suggest endpoints and index names, excluding dot-prefixed ones, if no comma and no dot', () => {
      const mockModel = {
        getValueInRange: () => 'GET _search',
        getWordUntilPosition: () => ({ startColumn: 12 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 12 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      expect(items.length).toBe(4);
      expect(
        items.every((item) => typeof item.label === 'string' && item.label.startsWith('.'))
      ).toBe(false);
    });

    it('suggests all endpoints and indices, including dot-prefixed ones, if last char is a dot', () => {
      const mockModel = {
        getValueInRange: () => 'GET .',
        getWordUntilPosition: () => ({ startColumn: 6 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 6 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      expect(items.length).toBe(5);
    });
  });

  describe('inline JSON body completion', () => {
    it('completes "term" inside {"query": {te}} without extra quotes or missing template', async () => {
      // 1) Set up a mock monaco model with two lines of text
      //    - Line 1: GET index/_search
      //    - Line 2: {"query": {te}}
      // In a real editor, requestStartLineNumber = 1 (0-based vs 1-based might differ),
      // so we adjust accordingly in the test.
      const mockModel = {
        getLineContent: (lineNumber: number) => {
          if (lineNumber === 1) {
            // request line
            return 'GET index/_search';
          } else if (lineNumber === 2) {
            // inline JSON with partial property 'te'
            return '{"query": {te}}';
          }
          return '';
        },
        // getValueInRange will return everything from line 2 up to our position
        getValueInRange: ({ startLineNumber, endLineNumber }: monaco.IRange) => {
          if (startLineNumber === 2 && endLineNumber === 2) {
            // partial body up to cursor (we can just return the entire line for simplicity)
            return '{"query": {te}}';
          }
          return '';
        },
        getWordUntilPosition: () => ({
          startColumn: 13, // approximate "te" start
          endColumn: 15,
          word: 'te',
        }),
        getLineMaxColumn: () => 999, // large max
      } as unknown as monaco.editor.ITextModel;

      // 2) The user is on line 2, at column ~15 (after 'te').
      const mockPosition = {
        lineNumber: 2,
        column: 15,
      } as monaco.Position;

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [
          {
            name: 'term',
          },
        ];
      });

      // 4) We call getBodyCompletionItems, passing requestStartLineNumber = 1
      //    because line 1 has "GET index/_search", so line 2 is the body.
      const mockEditor = {} as MonacoEditorActionsProvider;
      const suggestions = await getBodyCompletionItems(
        mockModel,
        mockPosition,
        1, // the line number where the request method/URL is
        mockEditor
      );

      // 5) We should get 1 suggestion for "term"
      expect(suggestions).toHaveLength(1);
      const termSuggestion = suggestions[0];

      // 6) Check the snippet text. For example, if your final snippet logic
      //    inserts `"term": $0`, we ensure there's no extra quote like ""term"
      //    and if you have a template for "term", we can check that too.
      const insertText = termSuggestion.insertText;

      // No double quotes at the start:
      expect(insertText).not.toContain('""term"');
      // Valid JSON snippet
      expect(insertText).toContain('"term"');
      expect(insertText).toContain('$0');
    });
  });
});
