/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import { replaceColumnsWithVariableDriven } from './replace_columns_with_variable_driven';

describe('replaceColumnsWithVariableDriven', () => {
  const mockResultDataSource = createMockEsqlSource([
    { name: 'timestamp', type: 'date', source: 'index' },
    { name: 'message', type: 'string', source: 'index' },
    { name: 'host', type: 'string', source: 'index' },
    { name: 'variableColumn', type: 'string', source: 'index' },
  ]);

  const mockEsqlVariables: ESQLControlVariable[] = [
    { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
    { key: 'otherVar', value: 'someOtherValue', type: ESQLVariableType.VALUES },
  ];

  describe('when not in ESQL mode', () => {
    it('should return original columns when isEsql is false', () => {
      const savedSearchColumns = ['timestamp', 'message', 'nonExistentColumn'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockResultDataSource,
        mockEsqlVariables,
        false
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when the result source is not provided', () => {
    it('should return original columns when the result source is undefined', () => {
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        undefined,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when no variable-driven columns exist', () => {
    it('should return original columns when no columns match ESQL variables', () => {
      const resultDataSourceWithoutVariables = createMockEsqlSource([
        { name: 'timestamp', type: 'date', source: 'index' },
        { name: 'message', type: 'string', source: 'index' },
        { name: 'host', type: 'string', source: 'index' },
      ]);
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        resultDataSourceWithoutVariables,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });

    it('should return original columns when esqlVariables is undefined', () => {
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockResultDataSource,
        undefined,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when variable-driven columns exist', () => {
    it('should replace non-existent columns with variable-driven column', () => {
      const savedSearchColumns = ['timestamp', 'nonExistentColumn', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockResultDataSource,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'variableColumn', 'message']);
    });

    it('should keep existing columns that are present in the result source', () => {
      const savedSearchColumns = ['timestamp', 'message', 'host'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockResultDataSource,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'message', 'host']);
    });

    it('should remove duplicates from the final result', () => {
      const savedSearchColumns = ['nonExistent1', 'nonExistent2', 'timestamp'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockResultDataSource,
        mockEsqlVariables,
        true
      );

      // Both non-existent columns get replaced with 'variableColumn', but duplicates are removed
      expect(result).toEqual(['variableColumn', 'timestamp']);
    });
  });
});
