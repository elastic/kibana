/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DatatableConfig,
  DatatableConfigESQL,
  DatatableConfigNoESQL,
} from '../../../../schema';
import type { TermsIndexPatternColumn } from '@kbn/lens-common';
import { buildFormBasedLayer, buildVisualizationState, getValueColumns } from '.';
import { DEFAULT_LAYER_ID } from '../../../../constants';

describe('Datatable ES|QL column ordering', () => {
  describe('buildVisualizationState', () => {
    it('should order visualization columns as rows, split_metrics_by, then metrics', () => {
      const config: DatatableConfig = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM test | LIMIT 10',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [{ column: 'bytes' }, { column: 'memory' }],
        rows: [{ column: 'agent' }, { column: 'host' }],
        split_metrics_by: [{ column: 'geo.src' }],
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
      const config: DatatableConfig = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM test | LIMIT 10',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [{ column: 'bytes' }],
        rows: [{ column: 'agent' }],
      };

      const result = buildVisualizationState(config);

      const rowCol = result.columns.find((c) => c.columnId === 'datatable_accessor_row_0');
      const metricCol = result.columns.find((c) => c.columnId === 'datatable_accessor_metric_0');

      expect(rowCol?.isMetric).toBe(false);
      expect(metricCol?.isMetric).toBe(true);
    });
  });

  describe('buildFormBasedLayer', () => {
    it('should order datasource columnOrder as split_metrics_by, rows, then metrics', () => {
      const config: DatatableConfigNoESQL = {
        type: 'data_table',
        data_source: {
          type: 'data_view_reference',
          ref_id: 'logstash-*',
        },
        sampling: 1,
        ignore_global_filters: false,
        metrics: [{ operation: 'median', field: 'bytes' }],
        rows: [
          {
            operation: 'terms',
            fields: ['geo.src'],
            limit: 7,
            rank_by: { type: 'metric', metric_index: 0, direction: 'desc' },
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['response.raw'],
            limit: 3,
            other_bucket: { include_documents_without_field: false },
            rank_by: { type: 'metric', metric_index: 0, direction: 'desc' },
          },
        ],
      };

      const layers = buildFormBasedLayer(config);
      const layer = layers[DEFAULT_LAYER_ID];

      expect(layer.columnOrder).toEqual([
        'datatable_accessor_split_metric_by_0',
        'datatable_accessor_row_0',
        'datatable_accessor_metric_0',
      ]);
    });

    it('should place reference columns after all visible metrics in columnOrder', () => {
      const config: DatatableConfigNoESQL = {
        type: 'data_table',
        data_source: {
          type: 'data_view_reference',
          ref_id: 'metrics-*',
        },
        sampling: 1,
        ignore_global_filters: false,
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: 'auto',
            include_empty_rows: false,
            use_original_time_range: false,
          },
          { operation: 'terms', fields: ['pipeline.name'], limit: 10 },
        ],
        metrics: [
          {
            operation: 'counter_rate',
            field: 'elasticsearch.ingest_pipeline.total.count',
          },
          {
            operation: 'counter_rate',
            field: 'elasticsearch.ingest_pipeline.total.time_in_millis',
          },
        ],
      };

      const layers = buildFormBasedLayer(config);
      const layer = layers[DEFAULT_LAYER_ID];

      expect(layer.columnOrder).toEqual([
        'datatable_accessor_row_0',
        'datatable_accessor_row_1',
        'datatable_accessor_metric_0',
        'datatable_accessor_metric_1',
        'datatable_accessor_metric_ref_0',
        'datatable_accessor_metric_ref_1',
      ]);
    });

    it('should resolve rank_by.metric_index against visible metrics when references exist', () => {
      const config: DatatableConfigNoESQL = {
        type: 'data_table',
        data_source: {
          type: 'data_view_reference',
          ref_id: 'metrics-*',
        },
        sampling: 1,
        ignore_global_filters: false,
        rows: [
          {
            operation: 'terms',
            fields: ['pipeline.name'],
            limit: 10,
            rank_by: { type: 'metric', metric_index: 1, direction: 'desc' },
          },
        ],
        metrics: [
          {
            operation: 'counter_rate',
            field: 'elasticsearch.ingest_pipeline.total.count',
          },
          {
            operation: 'counter_rate',
            field: 'elasticsearch.ingest_pipeline.total.time_in_millis',
          },
        ],
      };

      const layers = buildFormBasedLayer(config);
      const layer = layers[DEFAULT_LAYER_ID];
      const rowColumn = layer.columns.datatable_accessor_row_0 as TermsIndexPatternColumn;

      expect(rowColumn.operationType).toBe('terms');
      expect(rowColumn.params.orderBy).toEqual({
        type: 'column',
        columnId: 'datatable_accessor_metric_1',
      });
    });
  });

  describe('getValueColumns', () => {
    test('returns value columns for split_metrics_by, rows, and metrics', () => {
      const config = {
        type: 'data_table',
        metrics: [{ column: 'bytes' }, { column: 'requests' }],
        rows: [{ column: 'host' }],
        split_metrics_by: [{ column: 'region' }],
      } as unknown as DatatableConfigESQL;

      const result = getValueColumns(config);

      expect(result).toEqual([
        {
          columnId: 'datatable_accessor_split_metric_by_0',
          fieldName: 'region',
          meta: { type: 'string' },
        },
        {
          columnId: 'datatable_accessor_row_0',
          fieldName: 'host',
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
