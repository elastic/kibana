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
import { EsqlSource } from '@kbn/data-source';
import { replaceColumnsWithVariableDriven } from './replace_columns_with_variable_driven';

const createDataSourceFromColumnsMeta = (columnsMeta: Record<string, DatatableColumnMeta>) =>
  EsqlSource.create({
    query: 'FROM logs',
    resultColumns: Object.entries(columnsMeta).map(([name, meta]) => ({
      id: name,
      name,
      meta,
    })),
  });

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
    it('should return original columns when isEsql is false', async () => {
      const savedSearchColumns = ['timestamp', 'message', 'nonExistentColumn'];
      const mockDataSource = await createDataSourceFromColumnsMeta(mockColumnsMeta);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        mockEsqlVariables,
        false
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when dataSource is not provided', () => {
    it('should return original columns when dataSource is undefined', () => {
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
    it('should return original columns when no columns match ESQL variables', async () => {
      const columnsMetaWithoutVariables: Record<string, DatatableColumnMeta> = {
        timestamp: { type: 'date' },
        message: { type: 'string' },
        host: { type: 'string' },
      };
      const savedSearchColumns = ['timestamp', 'message'];
      const mockDataSource = await createDataSourceFromColumnsMeta(columnsMetaWithoutVariables);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });

    it('should return original columns when esqlVariables is undefined', async () => {
      const savedSearchColumns = ['timestamp', 'message'];
      const mockDataSource = await createDataSourceFromColumnsMeta(mockColumnsMeta);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        undefined,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when variable-driven columns exist', () => {
    it('should replace non-existent columns with variable-driven column', async () => {
      const savedSearchColumns = ['timestamp', 'nonExistentColumn', 'message'];
      const mockDataSource = await createDataSourceFromColumnsMeta(mockColumnsMeta);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'variableColumn', 'message']);
    });

    it('should keep existing columns that are present in columnsMeta', async () => {
      const savedSearchColumns = ['timestamp', 'message', 'host'];
      const mockDataSource = await createDataSourceFromColumnsMeta(mockColumnsMeta);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'message', 'host']);
    });

    it('should remove duplicates from the final result', async () => {
      const savedSearchColumns = ['nonExistent1', 'nonExistent2', 'timestamp'];
      const mockDataSource = await createDataSourceFromColumnsMeta(mockColumnsMeta);

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockDataSource,
        mockEsqlVariables,
        true
      );

      // Both non-existent columns get replaced with 'variableColumn', but duplicates are removed
      expect(result).toEqual(['variableColumn', 'timestamp']);
    });
  });
});
