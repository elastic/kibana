/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import { replaceColumnsWithVariableDriven } from './replace_columns_with_variable_driven';

describe('replaceColumnsWithVariableDriven', () => {
  const mockColumnsMeta: Record<string, DatatableColumnMeta> = {
    timestamp: { type: 'date' },
    message: { type: 'string' },
    host: { type: 'string' },
    variableColumn: { type: 'string' },
  };

  const mockEsqlVariables: ESQLControlVariable[] = [
    { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
    { key: 'otherVar', value: 'someOtherValue', type: ESQLVariableType.VALUES },
  ];

  describe('when not in ESQL mode', () => {
    it('should return original columns when isEsql is false', () => {
      const savedSearchColumns = ['timestamp', 'message', 'nonExistentColumn'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockColumnsMeta,
        mockEsqlVariables,
        false
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when columnsMeta is not provided', () => {
    it('should return original columns when columnsMeta is undefined', () => {
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
      const columnsMetaWithoutVariables: Record<string, DatatableColumnMeta> = {
        timestamp: { type: 'date' },
        message: { type: 'string' },
        host: { type: 'string' },
      };
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        columnsMetaWithoutVariables,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });

    it('should return original columns when esqlVariables is undefined', () => {
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockColumnsMeta,
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
        mockColumnsMeta,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'variableColumn', 'message']);
    });

    it('should keep existing columns that are present in columnsMeta', () => {
      const savedSearchColumns = ['timestamp', 'message', 'host'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockColumnsMeta,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'message', 'host']);
    });

    it('should remove duplicates from the final result', () => {
      const savedSearchColumns = ['nonExistent1', 'nonExistent2', 'timestamp'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockColumnsMeta,
        mockEsqlVariables,
        true
      );

      // Both non-existent columns get replaced with 'variableColumn', but duplicates are removed
      expect(result).toEqual(['variableColumn', 'timestamp']);
    });
  });
});
