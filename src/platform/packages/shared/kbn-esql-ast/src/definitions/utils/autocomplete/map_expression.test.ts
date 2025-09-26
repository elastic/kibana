/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../commands_registry/types';
import { withAutoSuggest } from './helpers';
import { getCommandMapExpressionSuggestions } from './map_expression';

describe('getCommandMapExpressionSuggestions', () => {
  const availableParameters: Record<string, ISuggestionItem[]> = {
    param1: [
      { label: 'value1', text: 'value1', kind: 'Constant', detail: 'value1' },
      { label: 'value2', text: 'value2', kind: 'Constant', detail: 'value2' },
    ],
    param2: [{ label: 'value3', text: 'value3', kind: 'Constant', detail: 'value3' }],
  };

  describe('parameters name suggestions', () => {
    it('should suggest all parameters names when the map is empty', () => {
      const query = '{';
      const suggestions = getCommandMapExpressionSuggestions(query, availableParameters);
      expect(suggestions).toEqual([
        withAutoSuggest({
          label: 'param1',
          kind: 'Constant',
          asSnippet: true,
          text: '"param1": "$0"',
          detail: 'param1',
          sortText: '1',
        }),
        withAutoSuggest({
          label: 'param2',
          kind: 'Constant',
          asSnippet: true,
          text: '"param2": "$0"',
          detail: 'param2',
          sortText: '1',
        }),
      ]);
    });

    it('should suggest all parameter names when the map is empty with whitespaces', () => {
      const innerText = '{\n  ';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param1', 'param2']);
    });

    it('should suggest remaining parameters names after a comma', () => {
      const innerText = '{"param1":"value1",';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param2']);
    });

    it('should suggest remaining parameters names after a comma with whitespace', () => {
      const innerText = '{"param1":"value1",  ';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param2']);
    });

    it('should not suggest already used parameters', () => {
      const innerText = '{"param1": "value1", "param2": "value3",';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toEqual([]);
    });
  });

  describe('parameters value suggestions', () => {
    it('should suggest values for a parameter', () => {
      const innerText = '{"param1": "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toEqual([
        { label: 'value1', text: 'value1', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: 'value2', kind: 'Constant', detail: 'value2' },
      ]);
    });

    it('should suggest values for a parameter with whitespace before', () => {
      const innerText = '{"param1":  "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toEqual([
        { label: 'value1', text: 'value1', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: 'value2', kind: 'Constant', detail: 'value2' },
      ]);
    });

    it('should return no suggestions if parameter does not exist', () => {
      const innerText = '{"unknown": "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toEqual([]);
    });

    it('should return no suggestions if text after value', () => {
      const innerText = '{"param1": "value"  ';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toEqual([]);
    });
  });

  describe('no suggestions', () => {
    it('should not return suggestions for empty text', () => {
      const suggestions = getCommandMapExpressionSuggestions('', availableParameters);
      expect(suggestions).toEqual([]);
    });

    it('should not return suggestions for invalid text', () => {
      const suggestions = getCommandMapExpressionSuggestions('{ "param1"', availableParameters);
      expect(suggestions).toEqual([]);
    });
  });
});
