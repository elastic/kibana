/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { EsqlVariablesService } from './variables_service';

describe('EsqlVariablesService', () => {
  let esqlVariablesService: EsqlVariablesService;

  beforeEach(() => {
    esqlVariablesService = new EsqlVariablesService();
  });

  describe('enableSuggestions', () => {
    it('should enable suggestions', () => {
      esqlVariablesService.enableSuggestions();
      expect(esqlVariablesService.areSuggestionsEnabled).toBe(true);
    });
  });

  describe('disableSuggestions', () => {
    it('should disable suggestions', () => {
      esqlVariablesService.disableSuggestions();
      expect(esqlVariablesService.areSuggestionsEnabled).toBe(false);
    });
  });

  describe('addVariable', () => {
    it('should add a variable', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.esqlVariables).toEqual([variable]);
    });

    it('should not add a variable if it already exists', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.esqlVariables).toEqual([variable]);
    });

    it('should add a variable with a number value', () => {
      const variable = {
        key: 'my_variable',
        value: 10,
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.esqlVariables).toEqual([variable]);
    });
  });

  describe('clearVariables', () => {
    it('should clear all variables', () => {
      const variable1 = {
        key: 'my_variable1',
        value: 'my_value1',
        type: ESQLVariableType.VALUES,
      };
      const variable2 = {
        key: 'my_variable2',
        value: 'my_value2',
        type: ESQLVariableType.FIELDS,
      };
      esqlVariablesService.addVariable(variable1);
      esqlVariablesService.addVariable(variable2);
      esqlVariablesService.clearVariables();
      expect(esqlVariablesService.esqlVariables).toEqual([]);
    });
  });
});
