/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayer } from '@kbn/lens-common';
import { getValueColumn, getValueApiColumn } from './esql_column';

describe('esql_column transforms', () => {
  describe('getValueColumn', () => {
    it('returns a column with the correct id and fieldName', () => {
      const result = getValueColumn('col_0', { column: 'bytes' });
      expect(result).toEqual({
        columnId: 'col_0',
        fieldName: 'bytes',
        meta: { type: 'string' },
      });
    });

    it('uses the id as fieldName when column is empty', () => {
      const result = getValueColumn('col_0', { column: '' });
      expect(result.fieldName).toBe('col_0');
    });

    it('respects data_type when provided', () => {
      const result = getValueColumn('col_0', { column: 'bytes', data_type: 'number' });
      expect(result.meta).toEqual({ type: 'number' });
    });

    it('sets label and customLabel when label is provided', () => {
      const result = getValueColumn('col_0', { column: 'bytes', label: 'Network Traffic' });
      expect(result.label).toBe('Network Traffic');
      expect(result.customLabel).toBe(true);
    });

    it('does not set label or customLabel when label is absent', () => {
      const result = getValueColumn('col_0', { column: 'bytes' });
      expect(result.label).toBeUndefined();
      expect(result.customLabel).toBeUndefined();
    });

    it('sets inMetricDimension when provided', () => {
      const result = getValueColumn('col_0', { column: 'bytes' }, true);
      expect(result.inMetricDimension).toBe(true);
    });

    it('does not set inMetricDimension when not provided', () => {
      const result = getValueColumn('col_0', { column: 'bytes' });
      expect(result.inMetricDimension).toBeUndefined();
    });

    it('sets params.format when format is provided', () => {
      const result = getValueColumn('col_0', {
        column: 'bytes',
        data_type: 'number',
        format: { type: 'number', decimals: 1, compact: false },
      });
      expect(result.params).toEqual({
        format: { id: 'number', params: { decimals: 1, compact: false } },
      });
    });

    it('does not set params when format is absent', () => {
      const result = getValueColumn('col_0', { column: 'bytes', data_type: 'number' });
      expect(result.params).toBeUndefined();
    });
  });

  describe('getValueApiColumn', () => {
    const buildLayer = (columns: TextBasedLayer['columns']): TextBasedLayer => ({
      index: 'test-*',
      query: { esql: 'FROM test | LIMIT 10' },
      columns,
    });

    it('returns the basic API column shape', () => {
      const layer = buildLayer([{ columnId: 'col_0', fieldName: 'bytes' }]);
      const result = getValueApiColumn('col_0', layer);
      expect(result).toEqual({
        operation: 'value',
        column: 'bytes',
      });
    });

    it('includes data_type when meta.type is present', () => {
      const layer = buildLayer([
        { columnId: 'col_0', fieldName: 'bytes', meta: { type: 'number' } },
      ]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.data_type).toBe('number');
    });

    it('includes label when customLabel is true', () => {
      const layer = buildLayer([
        { columnId: 'col_0', fieldName: 'bytes', label: 'Network Traffic', customLabel: true },
      ]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.label).toBe('Network Traffic');
    });

    it('does not include label when customLabel is false', () => {
      const layer = buildLayer([
        { columnId: 'col_0', fieldName: 'bytes', label: 'bytes', customLabel: false },
      ]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.label).toBeUndefined();
    });

    it('does not include label when customLabel is absent', () => {
      const layer = buildLayer([{ columnId: 'col_0', fieldName: 'bytes', label: 'bytes' }]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.label).toBeUndefined();
    });

    it('round-trips label through getValueColumn and getValueApiColumn', () => {
      const apiColumn = { column: 'bytes', label: 'Network Traffic' };
      const stateColumn = getValueColumn('col_0', apiColumn);
      const layer = buildLayer([stateColumn]);
      const roundTripped = getValueApiColumn('col_0', layer);
      expect(roundTripped.label).toBe('Network Traffic');
    });

    it('round-trips without label when not provided', () => {
      const apiColumn = { column: 'bytes' };
      const stateColumn = getValueColumn('col_0', apiColumn);
      const layer = buildLayer([stateColumn]);
      const roundTripped = getValueApiColumn('col_0', layer);
      expect(roundTripped.label).toBeUndefined();
    });

    it('includes format when params.format is present', () => {
      const layer = buildLayer([
        {
          columnId: 'col_0',
          fieldName: 'bytes',
          meta: { type: 'number' },
          params: { format: { id: 'percent', params: { decimals: 1 } } },
        },
      ]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.format).toEqual({ type: 'percent', decimals: 1 });
    });

    it('does not include format when params.format is absent', () => {
      const layer = buildLayer([
        { columnId: 'col_0', fieldName: 'bytes', meta: { type: 'number' } },
      ]);
      const result = getValueApiColumn('col_0', layer);
      expect(result.format).toBeUndefined();
    });

    it('round-trips format through getValueColumn and getValueApiColumn', () => {
      const apiColumn = {
        column: 'bytes',
        data_type: 'number',
        format: { type: 'number' as const, decimals: 2, compact: true },
      };
      const stateColumn = getValueColumn('col_0', apiColumn);
      const layer = buildLayer([stateColumn]);
      const roundTripped = getValueApiColumn('col_0', layer);
      expect(roundTripped.format).toEqual({ type: 'number', decimals: 2, compact: true });
    });
  });
});
