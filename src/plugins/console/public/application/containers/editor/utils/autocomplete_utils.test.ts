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
import { AutoCompleteContext } from '../../../../lib/autocomplete/types';
import {
  getDocumentationLinkFromAutocomplete,
  getUrlPathCompletionItems,
  shouldTriggerSuggestions,
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

    it('suggest endpoints and index names if no comma', () => {
      const mockModel = {
        getValueInRange: () => 'GET _search',
        getWordUntilPosition: () => ({ startColumn: 12 }),
      } as unknown as monaco.editor.ITextModel;
      const mockPosition = { lineNumber: 1, column: 12 } as unknown as monaco.Position;
      const items = getUrlPathCompletionItems(mockModel, mockPosition);
      expect(items.length).toBe(4);
    });
  });
});
