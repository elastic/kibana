/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import { replaceColumnsWithVariableDriven } from './replace_columns_with_variable_driven';
import { fieldList } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';

describe('replaceColumnsWithVariableDriven', () => {
  const mockEsqlDataView = buildDataViewMock({
    name: 'test-esql-data-view',
    fields: fieldList([
      { name: 'timestamp', type: 'date', searchable: true, aggregatable: true, scripted: false },
      { name: 'message', type: 'string', searchable: true, aggregatable: false, scripted: false },
      { name: 'host', type: 'string', searchable: true, aggregatable: true, scripted: false },
      {
        name: 'variableColumn',
        type: 'string',
        searchable: true,
        aggregatable: true,
        scripted: false,
      },
    ]),
  });

  const mockEsqlVariables: ESQLControlVariable[] = [
    { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
    { key: 'otherVar', value: 'someOtherValue', type: ESQLVariableType.VALUES },
  ];

  describe('when not in ESQL mode', () => {
    it('should return original columns when isEsql is false', () => {
      const savedSearchColumns = ['timestamp', 'message', 'nonExistentColumn'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockEsqlDataView,
        mockEsqlVariables,
        false
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when esqlDataView is not provided', () => {
    it('should return original columns when esqlDataView is undefined', () => {
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
      const dataViewWithoutVariables = buildDataViewMock({
        name: 'test-data-view',
        fields: fieldList([
          {
            name: 'timestamp',
            type: 'date',
            searchable: true,
            aggregatable: true,
            scripted: false,
          },
          {
            name: 'message',
            type: 'string',
            searchable: true,
            aggregatable: false,
            scripted: false,
          },
          { name: 'host', type: 'string', searchable: true, aggregatable: true, scripted: false },
        ]),
      });
      const savedSearchColumns = ['timestamp', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        dataViewWithoutVariables,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(savedSearchColumns);
    });
  });

  describe('when variable-driven columns exist', () => {
    it('should replace non-existent columns with variable-driven column', () => {
      const savedSearchColumns = ['timestamp', 'message', 'nonExistentColumn'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockEsqlDataView,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'message', 'variableColumn']);
    });

    it('should not replace columns that exist in current request', () => {
      const savedSearchColumns = ['timestamp', 'message', 'host'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockEsqlDataView,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual(['timestamp', 'message', 'host']);
    });

    it('should remove duplicates when multiple columns are replaced', () => {
      const savedSearchColumns = ['timestamp', 'nonExistent1', 'nonExistent2', 'message'];

      const result = replaceColumnsWithVariableDriven(
        savedSearchColumns,
        mockEsqlDataView,
        mockEsqlVariables,
        true
      );

      // Both nonExistent1 and nonExistent2 would be replaced with variableColumn,
      // but only one should remain after deduplication
      expect(result).toEqual(['timestamp', 'variableColumn', 'message']);
    });

    it('should handle empty savedSearchColumns', () => {
      const result = replaceColumnsWithVariableDriven(
        [],
        mockEsqlDataView,
        mockEsqlVariables,
        true
      );

      expect(result).toEqual([]);
    });
  });
});
