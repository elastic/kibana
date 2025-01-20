/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { EsqlVariablesService } from './esql_variables_service';

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
      expect(esqlVariablesService.getVariables()).toEqual([variable]);
    });

    it('should not add a variable if it already exists', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.getVariables()).toEqual([variable]);
    });

    it('should add a variable with a number value', () => {
      const variable = {
        key: 'my_variable',
        value: 10,
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.getVariables()).toEqual([variable]);
    });
  });

  describe('getVariable', () => {
    it('should return a variable by key', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.getVariable('my_variable')).toEqual(variable);
    });

    it('should return undefined if the variable does not exist', () => {
      expect(esqlVariablesService.getVariable('my_variable')).toBeUndefined();
    });
  });

  describe('getVariablesByType', () => {
    it('should return variables by type', () => {
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
      expect(esqlVariablesService.getVariablesByType(ESQLVariableType.VALUES)).toEqual([variable1]);
    });

    it('should return an empty array if there are no variables of the specified type', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      expect(esqlVariablesService.getVariablesByType(ESQLVariableType.FIELDS)).toEqual([]);
    });
  });

  describe('updateVariable', () => {
    it('should update a variable', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      esqlVariablesService.updateVariable({
        key: 'my_variable',
        value: 'my_new_value',
        type: ESQLVariableType.FIELDS,
      });
      expect(esqlVariablesService.getVariable('my_variable')).toEqual({
        key: 'my_variable',
        value: 'my_new_value',
        type: ESQLVariableType.FIELDS,
      });
    });

    it('should not update a variable if it does not exist', () => {
      esqlVariablesService.updateVariable({
        key: 'my_variable',
        value: 'my_new_value',
        type: ESQLVariableType.FIELDS,
      });
      expect(esqlVariablesService.getVariable('my_variable')).toBeUndefined();
    });

    it('should update a variable with a numeric value', () => {
      const variable = {
        key: 'my_variable',
        value: 'my_value',
        type: ESQLVariableType.VALUES,
      };
      esqlVariablesService.addVariable(variable);
      esqlVariablesService.updateVariable({
        key: 'my_variable',
        value: 10,
        type: ESQLVariableType.VALUES,
      });
      expect(esqlVariablesService.getVariable('my_variable')).toEqual({
        key: 'my_variable',
        value: 10,
        type: ESQLVariableType.VALUES,
      });
    });

    describe('removeVariable', () => {
      it('should remove a variable', () => {
        const variable = {
          key: 'my_variable',
          value: 'my_value',
          type: ESQLVariableType.VALUES,
        };
        esqlVariablesService.addVariable(variable);
        esqlVariablesService.removeVariable('my_variable');
        expect(esqlVariablesService.getVariables()).toEqual([]);
      });

      it('should not remove a variable if it does not exist', () => {
        esqlVariablesService.removeVariable('my_variable');
        expect(esqlVariablesService.getVariables()).toEqual([]);
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
        expect(esqlVariablesService.getVariables()).toEqual([]);
      });
    });

    describe('variableExists', () => {
      it('should return true if the variable exists', () => {
        const variable = {
          key: 'my_variable',
          value: 'my_value',
          type: ESQLVariableType.VALUES,
        };
        esqlVariablesService.addVariable(variable);
        expect(esqlVariablesService.variableExists('my_variable')).toBe(true);
      });

      it('should return false if the variable does not exist', () => {
        expect(esqlVariablesService.variableExists('my_variable')).toBe(false);
      });
    });
  });
});
