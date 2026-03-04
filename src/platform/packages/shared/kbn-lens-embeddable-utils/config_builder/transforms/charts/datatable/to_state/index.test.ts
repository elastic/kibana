/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableState, DatatableStateESQL } from '../../../../schema';
import { buildVisualizationState, getValueColumns } from '.';

describe('Datatable ES|QL column ordering', () => {
  describe('buildVisualizationState', () => {
    it('should order visualization columns as rows, split_metrics_by, then metrics', () => {
      const config: DatatableState = {
        type: 'datatable',
        dataset: {
          type: 'esql',
          query: 'FROM test | LIMIT 10',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [
          { operation: 'value', column: 'bytes' },
          { operation: 'value', column: 'memory' },
        ],
        rows: [
          { operation: 'value', column: 'agent' },
          { operation: 'value', column: 'host' },
        ],
        split_metrics_by: [{ operation: 'value', column: 'geo.src' }],
      };

      const result = buildVisualizationState(config);

      // Expect: rows first, then split_metrics_by, then metrics
      expect(result.columns.map((c) => c.columnId)).toEqual([
        'datatable_accessor_row_0',
        'datatable_accessor_row_1',
        'datatable_accessor_split_metric_by_0',
        'datatable_accessor_metric_0',
        'datatable_accessor_metric_1',
      ]);
    });

    it('should mark row columns as isMetric: false and metric columns as isMetric: true', () => {
      const config: DatatableState = {
        type: 'datatable',
        dataset: {
          type: 'esql',
          query: 'FROM test | LIMIT 10',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [{ operation: 'value', column: 'bytes' }],
        rows: [{ operation: 'value', column: 'agent' }],
      };

      const result = buildVisualizationState(config);

      const rowCol = result.columns.find((c) => c.columnId === 'datatable_accessor_row_0');
      const metricCol = result.columns.find((c) => c.columnId === 'datatable_accessor_metric_0');

      expect(rowCol?.isMetric).toBe(false);
      expect(metricCol?.isMetric).toBe(true);
    });
  });

  describe('getValueColumns', () => {
    test('returns value columns for rows, split_metrics_by, and metrics', () => {
      const config = {
        type: 'datatable',
        metrics: [
          { operation: 'value', column: 'bytes' },
          { operation: 'value', column: 'requests' },
        ],
        rows: [{ operation: 'value', column: 'host' }],
        split_metrics_by: [{ operation: 'value', column: 'region' }],
      } as unknown as DatatableStateESQL;

      const result = getValueColumns(config);

      expect(result).toEqual([
        {
          columnId: 'datatable_accessor_row_0',
          fieldName: 'host',
          meta: { type: 'string' },
        },
        {
          columnId: 'datatable_accessor_split_metric_by_0',
          fieldName: 'region',
          meta: { type: 'string' },
        },
        {
          columnId: 'datatable_accessor_metric_0',
          fieldName: 'bytes',
          inMetricDimension: true,
          meta: { type: 'number' },
        },
        {
          columnId: 'datatable_accessor_metric_1',
          fieldName: 'requests',
          inMetricDimension: true,
          meta: { type: 'number' },
        },
      ]);
    });
  });
});
