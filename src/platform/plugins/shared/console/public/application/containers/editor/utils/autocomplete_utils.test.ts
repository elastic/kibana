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

const mockPopulateContext = jest.fn();

jest.mock('../../../../lib/autocomplete/engine', () => {
  return {
    populateContext: (...args: any) => {
      mockPopulateContext(args);
    },
  };
});
import { AutoCompleteContext, ResultTerm } from '../../../../lib/autocomplete/types';
import {
  getDocumentationLinkFromAutocomplete,
  getUrlPathCompletionItems,
  getBodyCompletionItems,
  shouldTriggerSuggestions,
  shouldInsertAutocompleteTemplate,
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
    it.each(['{"ignore_failure": ', '["ignore_failure": ', '"enabled": true, "ignore_failure": '])(
      'triggers suggestions for an inline property value after a body delimiter',
      (line) => {
        expect(shouldTriggerSuggestions(line)).toBe(true);
      }
    );
    it('triggers no suggestions for the property value when the value is typed (string)', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": "value');
      expect(actual).toBe(false);
    });
    it('triggers no suggestions for the property value when the value is typed (number)', () => {
      const actual = shouldTriggerSuggestions(' "propertyName": 5');
      expect(actual).toBe(false);
    });

    // #259250 C1: a body delimiter leaves the cursor at a new value position.
    it('triggers suggestions after a body continuation delimiter', () => {
      expect(shouldTriggerSuggestions('{')).toBe(true);
      expect(shouldTriggerSuggestions('  {')).toBe(true);
      expect(shouldTriggerSuggestions('\t{')).toBe(true);
      expect(shouldTriggerSuggestions('  "fields": [')).toBe(true);
      expect(shouldTriggerSuggestions('  "field",')).toBe(true);
    });

    it('does not treat a brace followed by object content as a trigger position', () => {
      expect(shouldTriggerSuggestions('{ "already": 1')).toBe(false);
      expect(shouldTriggerSuggestions('{foo')).toBe(false);
      expect(shouldTriggerSuggestions('{"partial')).toBe(false);
    });

    // #284530 review: `{` typed after a property name should also auto-trigger.
    it('triggers suggestions when the line ends with an opening brace after content', () => {
      expect(shouldTriggerSuggestions('"query": {')).toBe(true);
      expect(shouldTriggerSuggestions('  "pipeline": {')).toBe(true);
      expect(shouldTriggerSuggestions('"query": {  ')).toBe(true);
    });

    it('does not trigger for a body delimiter inside an unclosed string', () => {
      expect(shouldTriggerSuggestions('"foo": "bar {')).toBe(false);
      expect(shouldTriggerSuggestions('"regex": "a{')).toBe(false);
      expect(shouldTriggerSuggestions('"description": "value,')).toBe(false);
    });

    it('handles even backslashes before a closing quote', () => {
      expect(shouldTriggerSuggestions('{"path":"C:\\\\","nested": {')).toBe(true);
      expect(shouldTriggerSuggestions('{"path":"C:\\\\","description":"a{')).toBe(false);
    });

    it('handles a completed triple-quoted string before an opening brace', () => {
      expect(shouldTriggerSuggestions('{"script": """def quote = \'"\';""", "query": {')).toBe(
        true
      );
    });

    it('handles a multiline triple-quoted string before an opening brace', () => {
      expect(shouldTriggerSuggestions('{"script": """\ndef quote = \'"\';\n""", "query": {')).toBe(
        true
      );
    });
  });

  describe('shouldInsertAutocompleteTemplate', () => {
    it('allows template when the rest of the line is empty or a lone quote', () => {
      expect(shouldInsertAutocompleteTemplate('')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('   ')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('"')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('  "')).toBe(true);
    });

    it('allows template when the rest of the line is only closing braces', () => {
      expect(shouldInsertAutocompleteTemplate('}')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('}}')).toBe(true);
    });

    it('rejects template when other content follows the cursor', () => {
      expect(shouldInsertAutocompleteTemplate(': 1')).toBe(false);
      expect(shouldInsertAutocompleteTemplate(', "other"')).toBe(false);
      expect(shouldInsertAutocompleteTemplate('"already": 1')).toBe(false);
    });

    describe('WHEN only a trailing comma follows the cursor', () => {
      it.each([',', '",', ' , '])('SHOULD allow template insertion for %p', (suffix) => {
        expect(shouldInsertAutocompleteTemplate(suffix)).toBe(true);
      });
    });

    // #259250 C2: Monaco auto-closes `"` inside `{}`, leaving `"}` after the cursor.
    it('allows template when Monaco auto-closed quote sits before closing braces', () => {
      expect(shouldInsertAutocompleteTemplate('"}')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('  "}')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('"}]')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('"}}}')).toBe(true);
      expect(shouldInsertAutocompleteTemplate('"} ],')).toBe(true);
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

    it('parses the request from its start column when a block comment prefixes the line', () => {
      const line = '/* note */ GET ind';
      const mockModel = {
        getValueInRange: jest.fn(({ startColumn, endColumn }: any) =>
          line.slice(startColumn - 1, endColumn - 1)
        ),
        getWordUntilPosition: () => ({ startColumn: 16 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: line.length + 1 } as unknown as monaco.Position;
      // request starts at column 12 (`GET ...`), after the block-comment prefix
      const items = getUrlPathCompletionItems(mockModel, mockPosition, 12);
      // `parseLine` must see `GET ind`, not `/* note */ GET ind` (method would parse as `/*`)
      const lastCallArgs = mockPopulateContext.mock.calls.at(-1)?.[0];
      expect(lastCallArgs?.[1].method).toBe('GET');
      expect(items.map((item) => item.label)).toEqual(['index1', 'index2']);
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

    it('parses the method+url line from the request start column when comment-prefixed', async () => {
      const mockAutocompleteSet = [
        { name: 'index.mode', template: 'standard' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });

      const mockModel = {
        getLineContent: () => '/* note */ PUT my-index',
        getValueInRange: jest.fn((range: any) => {
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        index.mode';
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        index.mode';
          }
          return '';
        }),
        getWordUntilPosition: () => ({ startColumn: 15, word: 'mode' }),
        getLineMaxColumn: () => 19,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 4, column: 19 } as monaco.Position;

      // request starts at column 12 (`PUT ...`), after the block-comment prefix
      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor, 12);

      // `parseLine` must see `PUT my-index`, not the comment prefix (method would parse as `/*`)
      const urlContextCallArgs = mockPopulateContext.mock.calls[0]?.[0];
      expect(urlContextCallArgs?.[1].method).toBe('PUT');
      expect(items.length).toBe(1);
      expect(items[0].label).toBe('index.mode');
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

    it('replaces the rest of a quoted field when completing in the middle', async () => {
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [
          { name: 'icmp.type', template: 'standard' },
        ] as unknown as AutoCompleteContext['autoCompleteSet'];
      });

      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: monaco.IRange) => {
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        "icmp.ty';
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        "icmp.ty';
          }
          return 'pe"';
        }),
        getWordUntilPosition: () => ({ startColumn: 15, word: 'ty' }),
        getLineMaxColumn: () => 20,
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 4, column: 17 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items).toHaveLength(1);
      expect(items[0].insertText).toBe('icmp.type"');
      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: 10,
        endLineNumber: 4,
        endColumn: 20,
      });
    });

    describe('WHEN completing a primitive value inside an auto-closed string', () => {
      const buildModel = (
        editorLines: string[],
        wordUntilPosition: { startColumn: number; word: string }
      ) =>
        ({
          getLineContent: (lineNumber: number) => editorLines[lineNumber - 1],
          getValueInRange: jest.fn(
            ({ startLineNumber, startColumn, endLineNumber, endColumn }: monaco.IRange) => {
              if (startLineNumber === endLineNumber) {
                return editorLines[startLineNumber - 1].slice(startColumn - 1, endColumn - 1);
              }
              const selectedLines = editorLines.slice(startLineNumber - 1, endLineNumber);
              selectedLines[0] = selectedLines[0].slice(startColumn - 1);
              selectedLines[selectedLines.length - 1] = selectedLines[
                selectedLines.length - 1
              ].slice(0, endColumn - 1);
              return selectedLines.join('\n');
            }
          ),
          getWordUntilPosition: () => wordUntilPosition,
          getLineMaxColumn: (lineNumber: number) => editorLines[lineNumber - 1].length + 1,
        } as unknown as monaco.editor.ITextModel);

      // Simulates Monaco applying a completion item over its single-range form.
      const acceptSuggestion = (editorLines: string[], item: monaco.languages.CompletionItem) => {
        if (!item.range || !('startLineNumber' in item.range)) {
          throw new Error('completion item must use the single-range form');
        }
        const { range } = item;
        const line = editorLines[range.startLineNumber - 1];
        return (
          line.slice(0, range.startColumn - 1) + item.insertText + line.slice(range.endColumn - 1)
        );
      };

      beforeEach(() => {
        mockPopulateContext.mockImplementation((...args) => {
          const context = args[0][1];
          context.autoCompleteSet = [
            { name: false },
            { name: -1 },
            { name: 0.5 },
            { name: 1e-7 },
            { name: 1e21 },
            { name: 'false' },
            { name: 'some_string_value' },
          ] as unknown as AutoCompleteContext['autoCompleteSet'];
        });
      });

      it('SHOULD cover the opening quote for primitive terms when completing mid-word', async () => {
        const editorLines = ['GET _search', '{', '  "refresh": "f"'];
        // Cursor after `f`, before the auto-closed closing quote.
        const position = { lineNumber: 3, column: 16 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 15, word: 'f' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find(
          (item) => item.label === 'false' && item.insertText === 'false'
        );
        const stringTerm = items.find((item) => item.label === 'some_string_value');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 14, // includes the opening quote
          endLineNumber: 3,
          endColumn: 17, // includes the auto-closed closing quote
        });
        expect(primitive?.filterText).toBe('"false');
        expect(stringTerm?.range).toEqual({
          startLineNumber: 3,
          startColumn: 15, // string terms re-insert the quotes themselves
          endLineNumber: 3,
          endColumn: 17,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ refresh: false });
        expect(acc).toBe('  "refresh": false');
        expect(acceptSuggestion(editorLines, stringTerm!)).toBe('  "refresh": "some_string_value"');
      });

      it('SHOULD cover the opening quote and typed minus for negative primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": "-1"'];
        // Monaco's word starts at `1`, after the JSON minus.
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 14, word: '1' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '-1' && item.insertText === '-1');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12, // includes the opening quote and typed minus
          endLineNumber: 3,
          endColumn: 16,
        });
        expect(primitive?.filterText).toBe('"-1');
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: -1 });
        expect(acc).toBe('  "value": -1');
      });

      it('SHOULD cover the opening quote and typed decimal prefix for numeric primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": "0."'];
        // Cursor after `0.`, before the auto-closed closing quote; Monaco has no word at `.`.
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 15, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '0.5' && item.insertText === '0.5');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12, // includes the opening quote and typed decimal prefix
          endLineNumber: 3,
          endColumn: 16,
        });
        expect(primitive?.filterText).toBe('"0.5');
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: 0.5 });
        expect(acc).toBe('  "value": 0.5');
      });

      it('SHOULD suggest decimal primitive terms inside an array value', async () => {
        const editorLines = ['GET _search', '{', '  "values": ["0."]'];
        // Cursor after `0.`, before the auto-closed closing quote; Monaco has no word at `.`.
        const position = { lineNumber: 3, column: 17 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 17, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '0.5' && item.insertText === '0.5');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 14, // includes the opening quote and typed decimal prefix
          endLineNumber: 3,
          endColumn: 18,
        });
        expect(primitive?.filterText).toBe('"0.5');
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ values: [0.5] });
        expect(acc).toBe('  "values": [0.5]');
      });

      it('SHOULD replace the whole quoted dotted value for string terms', async () => {
        mockPopulateContext.mockImplementation((...args) => {
          const context = args[0][1];
          context.autoCompleteSet = [{ name: 'foo.bar' }];
        });
        const editorLines = ['GET _search', '{', '  "mode": "foo.b"'];
        // Cursor after `b`, before the auto-closed closing quote.
        const position = { lineNumber: 3, column: 17 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 16, word: 'b' }),
          position,
          1,
          mockEditor
        );

        const stringTerm = items.find((item) => item.label === 'foo.bar');
        expect(stringTerm?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12, // preserves the opening quote but replaces the full value prefix
          endLineNumber: 3,
          endColumn: 18,
        });
        expect(acceptSuggestion(editorLines, stringTerm!)).toBe('  "mode": "foo.bar"');
      });

      it('SHOULD replace the whole quoted punctuated value for non-dotted string terms', async () => {
        mockPopulateContext.mockImplementation((...args) => {
          const context = args[0][1];
          context.autoCompleteSet = [{ name: 'foo-bar' }];
        });
        const editorLines = ['GET _search', '{', '  "mode": "foo-b"'];
        // Cursor after `b`, before the auto-closed closing quote; Monaco's word starts after `-`.
        const position = { lineNumber: 3, column: 17 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 16, word: 'b' }),
          position,
          1,
          mockEditor
        );

        const stringTerm = items.find((item) => item.label === 'foo-bar');
        expect(stringTerm?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 18,
        });
        expect(acceptSuggestion(editorLines, stringTerm!)).toBe('  "mode": "foo-bar"');
      });

      it('SHOULD NOT suggest primitive terms inside a triple-quoted value', async () => {
        const editorLines = ['GET _search', '{', '  "value": """-1"""'];
        // Cursor after `-1`, before the closing triple quote.
        const position = { lineNumber: 3, column: 17 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 16, word: '1' }),
          position,
          1,
          mockEditor,
          1,
          { isInsideTripleQuotedString: true }
        );

        expect(items.find((item) => item.label === '-1')).toBeUndefined();
        expect(items.find((item) => item.label === '0.5')).toBeUndefined();
        expect(items.find((item) => item.label === 'some_string_value')).toBeDefined();
      });

      it('SHOULD NOT suggest primitive terms inside an oversized triple-quoted value', async () => {
        const pad = 'x'.repeat(100_001);
        const lineContentBeforePosition = `  "pad": "${pad}", "value": """-1`;
        const editorLines = ['GET _search', '{', `${lineContentBeforePosition}"""`];
        // Cursor after `-1`, before the closing triple quote.
        const position = {
          lineNumber: 3,
          column: lineContentBeforePosition.length + 1,
        } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: lineContentBeforePosition.length, word: '1' }),
          position,
          1,
          mockEditor,
          1,
          { isInsideTripleQuotedString: true }
        );

        expect(items.find((item) => item.label === '-1')).toBeUndefined();
        expect(items.find((item) => item.label === '0.5')).toBeUndefined();
        expect(items.find((item) => item.label === 'some_string_value')).toBeDefined();
      });

      it('SHOULD NOT suggest primitive terms inside a multiline triple-quoted value', async () => {
        const editorLines = ['GET _search', '{', '  "value": """', '-1', '"""'];
        // Cursor after `-1` in the multiline triple-quoted value.
        const position = { lineNumber: 4, column: 3 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 2, word: '1' }),
          position,
          1,
          mockEditor,
          1,
          { isInsideTripleQuotedString: true }
        );

        expect(items.find((item) => item.label === '-1')).toBeUndefined();
        expect(items.find((item) => item.label === '0.5')).toBeUndefined();
        expect(items.find((item) => item.label === 'some_string_value')).toBeDefined();
      });

      it('SHOULD NOT suggest primitive terms inside a multiline quoted value', async () => {
        const editorLines = ['GET _search', '{', '  "value": "abc', 'def -'];
        // Cursor after `-` on the continuation line of a quoted value whose
        // opening quote lives on the previous line.
        const position = { lineNumber: 4, column: 6 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 6, word: '' }),
          position,
          1,
          mockEditor
        );

        expect(items.find((item) => item.label === '-1')).toBeUndefined();
        expect(items.find((item) => item.label === '0.5')).toBeUndefined();
        expect(items.find((item) => item.label === 'some_string_value')).toBeDefined();
      });

      it('SHOULD cover both quotes when accepted straight from the trigger quote', async () => {
        const editorLines = ['GET _search', '{', '  "refresh": ""'];
        // Cursor between the auto-closed quotes, before typing anything.
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 15, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find(
          (item) => item.label === 'false' && item.insertText === 'false'
        );
        const stringTerm = items.find((item) => item.label === 'some_string_value');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 14, // includes the opening quote
          endLineNumber: 3,
          endColumn: 16, // includes the auto-closed closing quote
        });
        expect(primitive?.filterText).toBe('"false');
        expect(stringTerm?.range).toEqual({
          startLineNumber: 3,
          startColumn: 15,
          endLineNumber: 3,
          endColumn: 16,
        });
        expect(JSON.parse(`{${acceptSuggestion(editorLines, primitive!)}}`)).toEqual({
          refresh: false,
        });
        expect(acceptSuggestion(editorLines, stringTerm!)).toBe('  "refresh": "some_string_value"');
      });

      it('SHOULD NOT shift the range when typing an unquoted value', async () => {
        const editorLines = ['GET _search', '{', '  "refresh": f'];
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 14, word: 'f' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find(
          (item) => item.label === 'false' && item.insertText === 'false'
        );
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 14, // starts at the word: there is no quote to replace
          endLineNumber: 3,
          endColumn: 15,
        });
        expect(primitive?.filterText).toBeUndefined();
        expect(acceptSuggestion(editorLines, primitive!)).toBe('  "refresh": false');
      });

      it('SHOULD replace a bare minus prefix for negative primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": -'];
        const position = { lineNumber: 3, column: 13 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 13, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '-1' && item.insertText === '-1');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 13,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: -1 });
        expect(acc).toBe('  "value": -1');
      });

      it('SHOULD replace a bare decimal prefix for numeric primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": 0.'];
        const position = { lineNumber: 3, column: 14 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 14, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '0.5' && item.insertText === '0.5');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 14,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: 0.5 });
        expect(acc).toBe('  "value": 0.5');
      });

      it('SHOULD repair a bare leading-dot decimal prefix for numeric primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": .5'];
        const position = { lineNumber: 3, column: 14 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 13, word: '5' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '0.5' && item.insertText === '0.5');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 14,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: 0.5 });
        expect(acc).toBe('  "value": 0.5');
      });

      it('SHOULD replace a bare negative exponent prefix for numeric primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": 1e-'];
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 15, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find((item) => item.label === '1e-7' && item.insertText === '1e-7');
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 15,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: 1e-7 });
        expect(acc).toBe('  "value": 1e-7');
      });

      it('SHOULD replace a bare positive exponent prefix for numeric primitive terms', async () => {
        const editorLines = ['GET _search', '{', '  "value": 1e+'];
        const position = { lineNumber: 3, column: 15 } as monaco.Position;

        const items = await getBodyCompletionItems(
          buildModel(editorLines, { startColumn: 15, word: '' }),
          position,
          1,
          mockEditor
        );

        const primitive = items.find(
          (item) => item.label === '1e+21' && item.insertText === '1e+21'
        );
        expect(primitive?.range).toEqual({
          startLineNumber: 3,
          startColumn: 12,
          endLineNumber: 3,
          endColumn: 15,
        });
        const acc = acceptSuggestion(editorLines, primitive!);
        expect(JSON.parse(`{${acc}}`)).toEqual({ value: 1e21 });
        expect(acc).toBe('  "value": 1e+21');
      });

      it.each(['1e-7', '1e+21'])(
        'SHOULD complete sibling fields after an exponent primitive value %s',
        async (exponentValue) => {
          mockPopulateContext.mockImplementation((...args) => {
            const [bodyTokens, context] = args[0];
            context.autoCompleteSet =
              bodyTokens.at(-1) === '{'
                ? ([{ name: 'next_field' }] as unknown as AutoCompleteContext['autoCompleteSet'])
                : [];
          });
          const editorLines = ['GET _search', '{', `  "value": ${exponentValue}, "`];
          const position = {
            lineNumber: 3,
            column: editorLines[2].length + 1,
          } as monaco.Position;

          const items = await getBodyCompletionItems(
            buildModel(editorLines, { startColumn: editorLines[2].length, word: '' }),
            position,
            1,
            mockEditor
          );

          expect(items.map((item) => item.label)).toContain('next_field');
        }
      );
    });

    it('ignores quotes inside comments when completing in the middle of a quoted field', async () => {
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [{ name: 'query', template: 'standard' }];
      });
      const lines = ['GET _search', '{ /* " */ "query": {} }'];
      const lineContentBeforePosition = '{ /* " */ "que';
      const position = {
        lineNumber: 2,
        column: lineContentBeforePosition.length + 1,
      } as monaco.Position;
      const mockModel = {
        getLineContent: (lineNumber: number) => lines[lineNumber - 1],
        getValueInRange: jest.fn(
          ({ startLineNumber, startColumn, endLineNumber, endColumn }: monaco.IRange) => {
            if (startLineNumber === endLineNumber) {
              return lines[startLineNumber - 1].slice(startColumn - 1, endColumn - 1);
            }
            const selectedLines = lines.slice(startLineNumber - 1, endLineNumber);
            selectedLines[0] = selectedLines[0].slice(startColumn - 1);
            selectedLines[selectedLines.length - 1] = selectedLines[selectedLines.length - 1].slice(
              0,
              endColumn - 1
            );
            return selectedLines.join('\n');
          }
        ),
        getWordUntilPosition: () => ({ startColumn: 12, word: 'que' }),
        getLineMaxColumn: (lineNumber: number) => lines[lineNumber - 1].length + 1,
      } as unknown as monaco.editor.ITextModel;

      const items = await getBodyCompletionItems(mockModel, position, 1, mockEditor);

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(
        expect.objectContaining({
          insertText: 'query"',
          range: {
            startLineNumber: 2,
            startColumn: 12,
            endLineNumber: 2,
            endColumn: 18,
          },
        })
      );
    });

    it('replaces through an escaped quote when completing in the middle of a string', async () => {
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [
          { name: 'icmp.type', template: 'standard' },
        ] as unknown as AutoCompleteContext['autoCompleteSet'];
      });

      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: monaco.IRange) => {
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        "icmp.ty';
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        "icmp.ty';
          }
          return 'pe\\"suffix"';
        }),
        getWordUntilPosition: () => ({ startColumn: 15, word: 'ty' }),
        getLineMaxColumn: () => 28,
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 4, column: 17 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items).toHaveLength(1);
      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: 10,
        endLineNumber: 4,
        endColumn: 28,
      });
    });

    it.each([
      {
        caseName: 'an odd backslash run ending before the cursor',
        lineContentBeforePosition: '        "value\\',
        lineContentAfterPosition: '"tail"',
        closingQuoteLength: 6,
      },
      {
        caseName: 'an even backslash run ending before the cursor',
        lineContentBeforePosition: '        "value\\\\',
        lineContentAfterPosition: '"tail"',
        closingQuoteLength: 1,
      },
      {
        caseName: 'an even backslash run after the cursor',
        lineContentBeforePosition: '        "value',
        lineContentAfterPosition: '\\\\"tail"',
        closingQuoteLength: 3,
      },
    ])('uses quote-escape parity for $caseName', async (testCase) => {
      const { lineContentBeforePosition, lineContentAfterPosition, closingQuoteLength } = testCase;
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [{ name: 'replacement' }];
      });
      const position = {
        lineNumber: 4,
        column: lineContentBeforePosition.length + 1,
      } as monaco.Position;
      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: monaco.IRange) => {
          if (range.startLineNumber === 2) {
            return `{\n    "settings": {\n${lineContentBeforePosition}`;
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return lineContentBeforePosition;
          }
          return lineContentAfterPosition;
        }),
        getWordUntilPosition: () => ({ startColumn: position.column, word: '' }),
        getLineMaxColumn: () =>
          lineContentBeforePosition.length + lineContentAfterPosition.length + 1,
      } as unknown as monaco.editor.ITextModel;

      const items = await getBodyCompletionItems(mockModel, position, 1, mockEditor);

      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: position.column,
        endLineNumber: 4,
        endColumn: position.column + closingQuoteLength,
      });
    });

    it('does not consume a later quoted property when completing outside a string', async () => {
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [{ name: false }, { name: true }];
      });

      const mockModel = {
        getLineContent: () => 'PUT my-index',
        getValueInRange: jest.fn((range: monaco.IRange) => {
          if (range.startLineNumber === 2) {
            return '{\n    "settings": {\n        "enabled": ';
          }
          if (range.startColumn === 1 && range.endLineNumber === 4) {
            return '        "enabled": ';
          }
          return 'true, "other": "';
        }),
        getWordUntilPosition: () => ({ startColumn: 20, word: '' }),
        getLineMaxColumn: () => 36,
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 4, column: 20 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items).toHaveLength(2);
      expect(items[0].range).toEqual({
        startLineNumber: 4,
        startColumn: 20,
        endLineNumber: 4,
        endColumn: 20,
      });
    });

    it('filters structural suggestions when cursor is inside an unclosed quote (unmatched endpoint)', async () => {
      const mockAutocompleteSet = [
        { name: '{' },
        { name: 'match_all', insertValue: '{' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = mockAutocompleteSet;
      });

      const mockModel = {
        getLineContent: () => 'POST not_a_real_endpoint',
        getValueInRange: jest.fn((range: any) => {
          if (range.startLineNumber === 2) {
            return '{\n  "query": "';
          }
          if (range.startLineNumber === 3 && range.startColumn === 1) {
            return '  "query": "';
          }
          return '';
        }),
        getWordUntilPosition: () => ({ startColumn: 12, word: '' }),
        getLineMaxColumn: () => 12,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 3, column: 12 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items.map((item) => item.label)).toEqual(['match_all']);
    });

    it('filters structural suggestions when cursor is inside an unclosed quote (matched endpoint)', async () => {
      const mockAutocompleteSet = [
        { name: '{' },
        { name: 'type' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      const mockEndpoint = {
        bodyAutocompleteRootComponents: [],
      };

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.endpoint = mockEndpoint;
        context.autoCompleteSet = mockAutocompleteSet;
      });

      const mockModel = {
        getLineContent: () => 'PUT /test',
        getValueInRange: jest.fn((range: any) => {
          if (range.startLineNumber === 2) {
            return '{\n  "mappings": {\n    "properties": {\n      "integer_field": "';
          }
          if (range.startLineNumber === 5 && range.startColumn === 1) {
            return '      "integer_field": "';
          }
          return '';
        }),
        getWordUntilPosition: () => ({ startColumn: 24, word: '' }),
        getLineMaxColumn: () => 24,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 5, column: 24 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items.map((item) => item.label)).toEqual(['type']);
    });

    it('filters structural suggestions when cursor is before existing content on the line', async () => {
      const mockAutocompleteSet = [
        { name: '{' },
        { name: 'type' },
      ] as unknown as AutoCompleteContext['autoCompleteSet'];

      const mockEndpoint = {
        bodyAutocompleteRootComponents: [],
      };

      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.endpoint = mockEndpoint;
        context.autoCompleteSet = mockAutocompleteSet;
      });

      const mockModel = {
        getLineContent: () => 'PUT /test_index',
        getValueInRange: jest.fn((range: any) => {
          if (range.startLineNumber === 2) {
            return '{\n  "mappings": {\n    "properties": {\n      "integer_field": ';
          }
          if (range.startLineNumber === 5 && range.startColumn === 1) {
            return '      "integer_field": ';
          }
          // content after cursor: existing value
          return '"keyword"';
        }),
        getWordUntilPosition: () => ({ startColumn: 23, word: '' }),
        getLineMaxColumn: () => 32,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = { lineNumber: 5, column: 23 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      expect(items.map((item) => item.label)).toEqual(['type']);
    });

    // #284530 review: accepting `{` from the widget leaves the cursor inside `{}` without any
    // keypress, so the suggestion itself must re-open the widget via a post-accept command.
    it('adds a re-trigger command to suggestions that leave the cursor inside an empty container', async () => {
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [
          { name: '{' },
          { name: '[' },
          { name: 'community_id', template: {} },
          { name: 'fields', value: '[' },
          { name: 'append', template: { field: '', value: [] } },
        ] as AutoCompleteContext['autoCompleteSet'];
      });

      const mockModel = {
        getLineContent: () => 'POST _ingest/pipeline/_simulate',
        getValueInRange: jest.fn((range: monaco.IRange) => {
          if (range.startLineNumber === 2) {
            return '{\n  "pipeline": {\n    "processors": [\n      ';
          }
          if (range.startLineNumber === 5 && range.startColumn === 1) {
            return '      ';
          }
          return '';
        }),
        getWordUntilPosition: () => ({ startColumn: 7, word: '' }),
        getLineMaxColumn: () => 7,
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 5, column: 7 } as monaco.Position;

      const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

      const structural = items.find((item) => item.label === '{');
      const structuralArray = items.find((item) => item.label === '[');
      const withEmptyObject = items.find((item) => item.label === 'community_id');
      const withEmptyArray = items.find((item) => item.label === 'fields');
      const withTemplate = items.find((item) => item.label === 'append');
      expect(structural?.insertText).toBe('{$0}');
      expect(structural?.command).toEqual({ id: 'editor.action.triggerSuggest', title: '' });
      expect(structuralArray?.insertText).toBe('[$0]');
      expect(structuralArray?.command).toEqual({ id: 'editor.action.triggerSuggest', title: '' });
      expect(withEmptyObject?.insertText).toBe('"community_id": {$0}');
      expect(withEmptyObject?.command).toEqual({ id: 'editor.action.triggerSuggest', title: '' });
      expect(withEmptyArray?.insertText).toBe('"fields": [$0]');
      expect(withEmptyArray?.command).toEqual({ id: 'editor.action.triggerSuggest', title: '' });
      expect(withTemplate?.command).toBeUndefined();
    });

    describe('WHEN only body-closing tokens follow a templated completion', () => {
      it.each([
        { lineContentAfterPosition: '"}]', expectedEndColumn: 10 },
        { lineContentAfterPosition: '  "}]', expectedEndColumn: 12 },
        { lineContentAfterPosition: '"} ],', expectedEndColumn: 10 },
        { lineContentAfterPosition: '",', expectedEndColumn: 10 },
        { lineContentAfterPosition: ',', expectedEndColumn: 9 },
        { lineContentAfterPosition: '"}, // note', expectedEndColumn: 10 },
      ])(
        'SHOULD expand the template and replace the closing quote in $lineContentAfterPosition',
        async ({ lineContentAfterPosition, expectedEndColumn }) => {
          mockPopulateContext.mockImplementation((...args) => {
            const context = args[0][1];
            context.autoCompleteSet = [
              { name: 'append', template: { field: '', ['value' as string]: [] } },
            ] as AutoCompleteContext['autoCompleteSet'];
          });

          const mockModel = {
            getLineContent: () => 'POST _ingest/pipeline/_simulate',
            getValueInRange: jest.fn((range: monaco.IRange) => {
              if (range.startLineNumber === 2) {
                return '{\n  "pipeline": {\n    "processors": [\n      {"';
              }
              if (range.startLineNumber === 5 && range.startColumn === 1) {
                return '      {"';
              }
              return lineContentAfterPosition;
            }),
            getWordUntilPosition: () => ({ startColumn: 9, word: '' }),
            getLineMaxColumn: () => 9 + lineContentAfterPosition.length,
          } as unknown as monaco.editor.ITextModel;
          const mockPosition = { lineNumber: 5, column: 9 } as monaco.Position;

          const items = await getBodyCompletionItems(mockModel, mockPosition, 1, mockEditor);

          expect(items).toHaveLength(1);
          expect(items[0]).toEqual(
            expect.objectContaining({
              insertText: 'append": {\n  "field": "",\n  "value": []\n}',
              range: {
                startLineNumber: 5,
                startColumn: 9,
                endLineNumber: 5,
                endColumn: expectedEndColumn,
              },
            })
          );
        }
      );

      it('does not consume a quote inside a trailing comment', async () => {
        mockPopulateContext.mockImplementation((...args) => {
          const context = args[0][1];
          context.autoCompleteSet = [{ name: 'next_field' }];
        });

        const lineContentBeforePosition = '      "field",';
        const lineContentAfterPosition = ' // "next field"';
        const position = {
          lineNumber: 4,
          column: lineContentBeforePosition.length + 1,
        } as monaco.Position;
        const mockModel = {
          getLineContent: () => 'GET _search',
          getValueInRange: jest.fn((range: monaco.IRange) => {
            if (range.startLineNumber === 2) {
              return `{
  "fields": [
${lineContentBeforePosition}`;
            }
            if (range.startLineNumber === position.lineNumber && range.startColumn === 1) {
              return lineContentBeforePosition;
            }
            return lineContentAfterPosition;
          }),
          getWordUntilPosition: () => ({ startColumn: position.column, word: '' }),
          getLineMaxColumn: () =>
            lineContentBeforePosition.length + lineContentAfterPosition.length + 1,
        } as unknown as monaco.editor.ITextModel;

        const items = await getBodyCompletionItems(mockModel, position, 1, mockEditor);

        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(
          expect.objectContaining({
            insertText: '"next_field"',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          })
        );
      });
    });
  });

  describe('getInsertText', () => {
    const mockContext = { addTemplate: false } as AutoCompleteContext;

    it('returns empty string if name is undefined', () => {
      expect(getInsertText({ name: undefined } as ResultTerm, '', mockContext)).toBe('');
    });

    it('SHOULD insert boolean and number names as JSON primitives', () => {
      expect(getInsertText({ name: true }, '', mockContext)).toBe('true');
      expect(getInsertText({ name: false }, '', mockContext)).toBe('false');
      expect(getInsertText({ name: 0 }, '', mockContext)).toBe('0');
      expect(getInsertText({ name: 42 }, '', mockContext)).toBe('42');
      expect(getInsertText({ name: 'false' }, '', mockContext)).toBe('"false"');
      expect(getInsertText({ name: '42' }, '', mockContext)).toBe('"42"');
    });

    it('SHOULD insert false and zero templates when addTemplate is true', () => {
      const context = { ...mockContext, addTemplate: true };

      expect(getInsertText({ name: 'disabled', template: false }, '', context)).toBe(
        '"disabled": false'
      );
      expect(getInsertText({ name: 'retries', template: 0 }, '', context)).toBe('"retries": 0');
    });

    it('SHOULD preserve key-only insertion for empty and null templates', () => {
      const context = { ...mockContext, addTemplate: true };

      expect(getInsertText({ name: '_source', template: '' }, '', context)).toBe('"_source"');
      expect(getInsertText({ name: 'field', template: null }, '', context)).toBe('"field"');
    });

    it.each([
      { conditionalTemplate: false, expected: '"enabled": false' },
      { conditionalTemplate: 0, expected: '"enabled": 0' },
      { conditionalTemplate: '', expected: '"enabled"' },
      { conditionalTemplate: null, expected: '"enabled"' },
    ])(
      'SHOULD use matching conditional template $conditionalTemplate instead of the default',
      ({ conditionalTemplate, expected }) => {
        const context: AutoCompleteContext = {
          ...mockContext,
          addTemplate: true,
          endpoint: {
            paramsAutocomplete: {
              getTopLevelComponents: () => [],
            },
            bodyAutocompleteRootComponents: [],
            data_autocomplete_rules: {
              enabled: {
                __one_of: [
                  { __template: true },
                  { __condition: { lines_regex: 'mode' }, __template: conditionalTemplate },
                ],
              },
            },
          },
        };

        expect(getInsertText({ name: 'enabled', template: true }, 'mode', context)).toBe(expected);
      }
    );

    it('does not add quotes around braces and brackets', () => {
      expect(
        getInsertText(
          { name: '{' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      ',
          mockContext
        )
      ).toBe('{$0}');
      expect(
        getInsertText(
          { name: '[' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      ',
          mockContext
        )
      ).toBe('[$0]');
      expect(
        getInsertText(
          { name: '{' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      "match_a',
          mockContext
        )
      ).toBe('{$0}');
    });

    it('wraps insertValue with quotes when appropriate', () => {
      expect(
        getInsertText(
          { name: 'query', insertValue: 'match_all' } as ResultTerm,
          '{\n' + '    "query": {\n' + '      ',
          mockContext
        )
      ).toBe('"match_all"');
    });

    it('adds an opening quote after a string closed following even backslashes', () => {
      expect(
        getInsertText({ name: 'nested' } as ResultTerm, '{"path":"C:\\\\","nested": ', mockContext)
      ).toBe('"nested"');
    });

    it('uses name when insertValue is a structural token', () => {
      expect(
        getInsertText(
          { name: 'match_all', insertValue: '{' } as ResultTerm,
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

    it('expands ingest append processor template when addTemplate is true', () => {
      const body =
        'POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {"';
      expect(
        getInsertText({ name: 'append', template: { field: '', ['value' as string]: [] } }, body, {
          ...mockContext,
          addTemplate: true,
        })
      ).toBe('append": {\n' + '  "field": "",\n' + '  "value": []\n' + '}');
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
