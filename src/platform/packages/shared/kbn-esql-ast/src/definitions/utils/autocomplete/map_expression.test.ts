/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MapParameters } from './map_expression';
import { getCommandMapExpressionSuggestions } from './map_expression';

describe('getCommandMapExpressionSuggestions', () => {
  const availableParameters: MapParameters = {
    param1: {
      type: 'string',
      suggestions: [
        { label: 'value1', text: 'value1', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: 'value2', kind: 'Constant', detail: 'value2' },
      ],
    },
    param2: {
      type: 'string',
      suggestions: [{ label: 'value3', text: 'value3', kind: 'Constant', detail: 'value3' }],
    },
  };

  describe('parameters name suggestions', () => {
    it('should suggest all parameters names when the map is empty', () => {
      const query = '{';
      const suggestions = getCommandMapExpressionSuggestions(query, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param1', 'param2']);
    });

    it('should suggest all parameter names when the map is empty with whitespaces', () => {
      const innerText = '{\n  ';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param1', 'param2']);
    });

    it('should suggest all parameters names when opening quotes after {', () => {
      const innerText = '{ "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param1', 'param2']);
    });

    it('should suggest remaining parameters names after a comma', () => {
      const innerText = '{"param1":"value1",';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions.map((s) => s.label)).toEqual(['param2']);
    });

    it('should suggest remaining parameters names after a comma followed by quotes', () => {
      const innerText = '{"param1":"value1", "';
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

  describe('parameter types', () => {
    it('should wrap parameter value in quotes if type is string', () => {
      const innerText = '{';
      const stringParameters: MapParameters = {
        paramString: {
          type: 'string',
        },
      };
      const suggestions = getCommandMapExpressionSuggestions(innerText, stringParameters);
      expect(suggestions.map((s) => s.text)).toEqual(['"paramString": "$0"']);
    });

    it('should suggest map snippet if type is map', () => {
      const innerText = '{';
      const mapParameters: MapParameters = {
        paramMap: {
          type: 'map',
        },
      };
      const suggestions = getCommandMapExpressionSuggestions(innerText, mapParameters);
      expect(suggestions.map((s) => s.text)).toEqual(['"paramMap": { $0 }']);
    });

    it('should not wrap parameter value in quotes if type is number or boolean', () => {
      const innerText = '{';
      const numberAndBooleanParameters: MapParameters = {
        paramNumber: {
          type: 'number',
        },
        paramBoolean: {
          type: 'boolean',
        },
      };
      const suggestions = getCommandMapExpressionSuggestions(innerText, numberAndBooleanParameters);
      expect(suggestions.map((s) => s.text)).toEqual(['"paramNumber": ', '"paramBoolean": ']);
    });
  });

  describe('parameters value suggestions', () => {
    it('should suggest values for a parameter', () => {
      const innerText = '{"param1": "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toMatchObject([
        { label: 'value1', text: '"value1"', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: '"value2"', kind: 'Constant', detail: 'value2' },
      ]);
    });

    it('should suggest values for a parameter with whitespace before', () => {
      const innerText = '{"param1":  "';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toMatchObject([
        { label: 'value1', text: '"value1"', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: '"value2"', kind: 'Constant', detail: 'value2' },
      ]);
    });

    it('should suggest values for a parameter after : without opening quotes', () => {
      const innerText = '{"param1": ';
      const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters);
      expect(suggestions).toMatchObject([
        { label: 'value1', text: '"value1"', kind: 'Constant', detail: 'value1' },
        { label: 'value2', text: '"value2"', kind: 'Constant', detail: 'value2' },
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

    // We don't have currently a case where we need suggestions in nested maps.
    it('should not return suggestions when inside a nested map', () => {
      const nestedMapScenarios = [
        '{ "weights": { ',
        '{ "weights": { "',
        '{ "weights": { "field1": 1, ',
        '{ "weights": { "field1": 1, "',
        '{ "param1": "value", "weights": { ',
        '{ "param1": "value", "weights": { "field1": 1, ',
      ];

      nestedMapScenarios.forEach((scenario) => {
        const suggestions = getCommandMapExpressionSuggestions(scenario, {
          ...availableParameters,
          weights: { type: 'map' },
        });
        expect(suggestions).toEqual([]);
      });
    });
  });
});
