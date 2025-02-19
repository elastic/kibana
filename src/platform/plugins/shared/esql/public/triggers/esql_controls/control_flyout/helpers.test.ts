/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '@kbn/monaco';
import {
  updateQueryStringWithVariable,
  getQueryForFields,
  areValuesIntervalsValid,
  getRecurrentVariableName,
  validateVariableName,
} from './helpers';

describe('helpers', () => {
  describe('updateQueryStringWithVariable', () => {
    it('should update the query string with the variable for an one line query string', () => {
      const queryString = 'FROM my_index | STATS BY ';
      const variable = 'my_variable';
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
      const variable = 'my_variable';
      const cursorPosition = { column: 12, lineNumber: 2 } as monaco.Position;
      const updatedQueryString = updateQueryStringWithVariable(
        queryString,
        variable,
        cursorPosition
      );
      expect(updatedQueryString).toBe('FROM my_index \n| STATS BY ?my_variable');
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
      const variable = validateVariableName('my_variable/123');
      expect(variable).toBe('my_variable123');
    });

    it('should remove the questionarks', () => {
      const variable = validateVariableName('?my_variable');
      expect(variable).toBe('my_variable');
    });

    it('should remove the _ in the first char', () => {
      const variable = validateVariableName('?_my_variable');
      expect(variable).toBe('my_variable');
    });
  });
});
