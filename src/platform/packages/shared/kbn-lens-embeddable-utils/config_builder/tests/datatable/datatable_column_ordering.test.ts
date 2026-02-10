/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayer, DatatableVisualizationState } from '@kbn/lens-common';
import { convertDatatableColumnsToAPI } from '../../transforms/charts/datatable/to_api/columns';
import { buildVisualizationState } from '../../transforms/charts/datatable/to_state';
import type { DatatableState } from '../../schema';

describe('Datatable ES|QL column ordering', () => {
  describe('convertDatatableColumnsToAPI', () => {
    it('should place row columns before metric columns even when metrics appear first in layer', () => {
      const layer: TextBasedLayer = {
        index: 'test-index',
        query: { esql: 'FROM test | LIMIT 10' },
        columns: [
          {
            columnId: 'metric1',
            fieldName: 'bytes',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'row1',
            fieldName: 'agent',
            meta: { type: 'string' },
          },
          {
            columnId: 'metric2',
            fieldName: 'memory',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'row2',
            fieldName: 'host',
            meta: { type: 'string' },
          },
        ],
      };

      const visualization: DatatableVisualizationState = {
        layerId: 'layer1',
        layerType: 'data',
        columns: [
          { columnId: 'metric1' },
          { columnId: 'row1', isTransposed: false, isMetric: false },
          { columnId: 'metric2' },
          { columnId: 'row2', isTransposed: false, isMetric: false },
        ],
      };

      const result = convertDatatableColumnsToAPI(layer, visualization);

      expect(result.rows).toEqual([
        expect.objectContaining({ column: 'agent' }),
        expect.objectContaining({ column: 'host' }),
      ]);
      expect(result.metrics).toEqual([
        expect.objectContaining({ column: 'bytes' }),
        expect.objectContaining({ column: 'memory' }),
      ]);
    });

    it('should place transposed (split_metrics_by) columns before metric columns', () => {
      const layer: TextBasedLayer = {
        index: 'test-index',
        query: { esql: 'FROM test | LIMIT 10' },
        columns: [
          {
            columnId: 'metric1',
            fieldName: 'bytes',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'split1',
            fieldName: 'geo.src',
            meta: { type: 'string' },
          },
          {
            columnId: 'row1',
            fieldName: 'agent',
            meta: { type: 'string' },
          },
        ],
      };

      const visualization: DatatableVisualizationState = {
        layerId: 'layer1',
        layerType: 'data',
        columns: [
          { columnId: 'metric1' },
          { columnId: 'split1', isTransposed: true, isMetric: false },
          { columnId: 'row1', isTransposed: false, isMetric: false },
        ],
      };

      const result = convertDatatableColumnsToAPI(layer, visualization);

      expect(result.rows).toEqual([expect.objectContaining({ column: 'agent' })]);
      expect(result.split_metrics_by).toEqual([expect.objectContaining({ column: 'geo.src' })]);
      expect(result.metrics).toEqual([expect.objectContaining({ column: 'bytes' })]);
    });

    it('should preserve relative order within each column group', () => {
      const layer: TextBasedLayer = {
        index: 'test-index',
        query: { esql: 'FROM test | LIMIT 10' },
        columns: [
          {
            columnId: 'metric1',
            fieldName: 'bytes',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'row1',
            fieldName: 'agent',
            meta: { type: 'string' },
          },
          {
            columnId: 'metric2',
            fieldName: 'memory',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'row2',
            fieldName: 'host',
            meta: { type: 'string' },
          },
          {
            columnId: 'row3',
            fieldName: 'ip',
            meta: { type: 'ip' },
          },
        ],
      };

      const visualization: DatatableVisualizationState = {
        layerId: 'layer1',
        layerType: 'data',
        columns: [
          { columnId: 'metric1' },
          { columnId: 'row1', isTransposed: false, isMetric: false },
          { columnId: 'metric2' },
          { columnId: 'row2', isTransposed: false, isMetric: false },
          { columnId: 'row3', isTransposed: false, isMetric: false },
        ],
      };

      const result = convertDatatableColumnsToAPI(layer, visualization);

      // Rows preserve their original relative order: agent, host, ip
      expect(result.rows).toEqual([
        expect.objectContaining({ column: 'agent' }),
        expect.objectContaining({ column: 'host' }),
        expect.objectContaining({ column: 'ip' }),
      ]);
      // Metrics preserve their original relative order: bytes, memory
      expect(result.metrics).toEqual([
        expect.objectContaining({ column: 'bytes' }),
        expect.objectContaining({ column: 'memory' }),
      ]);
    });

    it('should produce correct columnIdMapping after reordering', () => {
      const layer: TextBasedLayer = {
        index: 'test-index',
        query: { esql: 'FROM test | LIMIT 10' },
        columns: [
          {
            columnId: 'metric1',
            fieldName: 'bytes',
            meta: { type: 'number' },
            inMetricDimension: true,
          },
          {
            columnId: 'row1',
            fieldName: 'agent',
            meta: { type: 'string' },
          },
        ],
      };

      const visualization: DatatableVisualizationState = {
        layerId: 'layer1',
        layerType: 'data',
        columns: [
          { columnId: 'metric1' },
          { columnId: 'row1', isTransposed: false, isMetric: false },
        ],
      };

      const result = convertDatatableColumnsToAPI(layer, visualization);

      expect(result.columnIdMapping.get('row1')).toEqual({ type: 'row', index: 0 });
      expect(result.columnIdMapping.get('metric1')).toEqual({ type: 'metric', index: 0 });
    });
  });

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
});
