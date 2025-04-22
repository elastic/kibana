/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import { ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import {
  updateQueryStringWithVariable,
  getQueryForFields,
  areValuesIntervalsValid,
  getRecurrentVariableName,
  validateVariableName,
  checkVariableExistence,
} from './helpers';

describe('helpers', () => {
  describe('updateQueryStringWithVariable', () => {
    it('should update the query string with the variable for an one line query string', () => {
      const queryString = 'FROM my_index | STATS BY ';
      const variable = '?my_variable';
      const cursorPosition = { column: 26, lineNumber: 1 } as monaco.Position;
      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe('FROM my_index | STATS BY ?my_variable');
    });

    it('should update the query string with the variable for multiline query string', () => {
      const queryString = 'FROM my_index \n| STATS BY ';
      const variable = '?my_variable';
      const cursorPosition = { column: 12, lineNumber: 2 } as monaco.Position;
      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe('FROM my_index \n| STATS BY ?my_variable');
    });

    it('should adjust the query string for trailing question mark', () => {
      const queryString = 'FROM my_index | STATS BY ?';
      const cursorPosition = { column: 27, lineNumber: 1 } as monaco.Position;
      const variable = '?my_variable';

      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe('FROM my_index | STATS BY ?my_variable');
    });

    it('should adjust the query string if there is a ? at the second last position', () => {
      const queryString = 'FROM my_index | STATS PERCENTILE(bytes, ?)';
      const cursorPosition = { column: 42, lineNumber: 1 } as monaco.Position;
      const variable = '?my_variable';

      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe('FROM my_index | STATS PERCENTILE(bytes, ?my_variable)');
    });

    it('should adjust the query string if there is a ? at the last cursor position', () => {
      const queryString =
        'FROM my_index | STATS COUNT() BY BUCKET(@timestamp, ?, ?_tstart, ?_tend)';
      const cursorPosition = {
        lineNumber: 1,
        column: 54,
      } as monaco.Position;
      const variable = '?my_variable';

      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe(
        'FROM my_index | STATS COUNT() BY BUCKET(@timestamp, ?my_variable, ?_tstart, ?_tend)'
      );
    });

    it('should adjust the query string if there is a ? at the last cursor position for multilines query', () => {
      const queryString =
        'FROM my_index \n| STATS COUNT() BY BUCKET(@timestamp, ?, ?_tstart, ?_tend)';
      const cursorPosition = {
        lineNumber: 2,
        column: 40,
      } as monaco.Position;
      const variable = '?my_variable';

      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe(
        'FROM my_index \n| STATS COUNT() BY BUCKET(@timestamp, ?my_variable, ?_tstart, ?_tend)'
      );
    });
  });

  describe('getQueryForFields', () => {
    it('should return the query to retrieve the fields for an one liner base query string', () => {
      const queryString = 'FROM my_index | LIMIT 10 | WHERE a ==';
      const cursorPosition = { column: 37, lineNumber: 1 } as monaco.Position;
      const queryForFields = getQueryForFields(queryString, cursorPosition);
      expect(queryForFields).toBe('FROM my_index | LIMIT 10 ');
    });

    it('should return the query to retrieve the fields for a multi liner base query string', () => {
      const queryString = 'FROM my_index \n| LIMIT 10 \n| WHERE a ==';
      const cursorPosition = { column: 12, lineNumber: 3 } as monaco.Position;
      const queryForFields = getQueryForFields(queryString, cursorPosition);
      expect(queryForFields).toBe('FROM my_index \n| LIMIT 10 ');
    });
  });

  describe('areValuesIntervalsValid', () => {
    it('should return true if all values are valid intervals', () => {
      const values = ['1d', '2h', '3m', '4 seconds'];
      const isValid = areValuesIntervalsValid(values);
      expect(isValid).toBe(true);
    });

    it('should return false if any value is not a valid interval', () => {
      const values = ['1d', '2h', '3m', 'invalid'];
      const isValid = areValuesIntervalsValid(values);
      expect(isValid).toBe(false);
    });
  });

  describe('getRecurrentVariableName', () => {
    it('should return a new name if the name already exists', () => {
      const name = 'field';
      const existingNames = new Set(['field', 'field1', 'field2']);
      const newName = getRecurrentVariableName(name, existingNames);
      expect(newName).toBe('field3');
    });

    it('should return the same name if the name does not exist', () => {
      const name = 'field';
      const existingNames = new Set(['field1', 'field2']);
      const newName = getRecurrentVariableName(name, existingNames);
      expect(newName).toBe('field');
    });
  });

  describe('validateVariableName', () => {
    it('should return the variable without special characters', () => {
      const variable = validateVariableName('?my_variable/123', '?');
      expect(variable).toBe('?my_variable123');
    });

    it('should add questionarks if they dont exist', () => {
      const variable = validateVariableName('my_variable', '?');
      expect(variable).toBe('?my_variable');
    });

    it('should remove the _ after the ? prefix', () => {
      const variable = validateVariableName('?_my_variable', '?');
      expect(variable).toBe('?my_variable');
    });

    it('should remove the _ after the ?? prefix', () => {
      const variable = validateVariableName('??_my_variable', '??');
      expect(variable).toBe('??my_variable');
    });

    it('should not allow more than 2 questiomarks', () => {
      const variable = validateVariableName('???my_variable', '??');
      expect(variable).toBe('??my_variable');
    });
  });

  describe('checkVariableExistence', () => {
    it('should return true if the variable exists', () => {
      const variables = [
        { key: 'my_variable', type: ESQLVariableType.VALUES, value: 'value1' },
        { key: 'my_variable2', type: ESQLVariableType.FIELDS, value: 'value2' },
      ] as ESQLControlVariable[];
      const variableName = '?my_variable';
      const exists = checkVariableExistence(variables, variableName);
      expect(exists).toBe(true);
    });

    it('should return false if the variable does not exist', () => {
      const variables = [
        { key: 'my_variable', type: ESQLVariableType.VALUES, value: 'value1' },
        { key: 'my_variable2', type: ESQLVariableType.FIELDS, value: 'value2' },
      ] as ESQLControlVariable[];
      // here ?variable2 is different from ??variable2
      const variableName = '?my_variable2';
      const exists = checkVariableExistence(variables, variableName);
      expect(exists).toBe(false);
    });
  });
});
