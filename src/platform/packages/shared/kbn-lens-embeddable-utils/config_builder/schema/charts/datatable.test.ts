/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { DatatableState } from './datatable';
import { datatableStateSchema } from './datatable';

type DefaultDatatableConfig = Pick<DatatableState, 'sampling' | 'ignore_global_filters'>;
type DatatableWithoutDefaultsConfig = Omit<DatatableState, 'sampling' | 'ignore_global_filters'>;

describe('Datatable Schema', () => {
  const baseDatatableConfig: Omit<DatatableWithoutDefaultsConfig, 'metrics'> = {
    type: 'datatable',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  const defaultValues: DefaultDatatableConfig = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('basic configuration', () => {
    it('validates metrics with count metric operation', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
        ],
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metrics, rows and split_metrics_by operations', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates metric sorting configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'metric',
          index: 1,
          direction: 'desc',
        },
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates row sorting configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'row',
          index: 1,
          direction: 'desc',
        },
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates pivoted metric sorting configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'pivoted_metric',
          index: 1,
          values: ['success'],
          direction: 'desc',
        },
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates pivoted metric sorting configuration with multiple split dimensions', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            size: 5,
          },
          {
            operation: 'terms',
            fields: ['product'],
            size: 3,
          },
        ],
        sort_by: {
          column_type: 'pivoted_metric',
          index: 0,
          values: ['success1', 'success2'],
          direction: 'desc',
        },
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metrics', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'metrics'> = {
        ...baseDatatableConfig,
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws on empty rows', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws on empty split_metrics_by', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        split_metrics_by: [],
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid density height type', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'density'> & {
        density: { height: { header: { type: 'invalid' } } };
      } = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        density: {
          height: {
            header: { type: 'invalid' },
          },
        },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid density mode', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'density'> & {
        density: { mode: 'invalid' };
      } = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        density: {
          mode: 'invalid',
        },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid height type', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'density'> & {
        density: { height: { header: { type: 'invalid' } } };
      } = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        density: { height: { header: { type: 'invalid' } } },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when missing summary type', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'metrics'> & {
        metrics: {
          operation: 'median';
          field: 'bytes';
          summary: { label: 'Average bytes' };
        }[];
      } = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
            summary: { label: 'Average bytes' },
          },
        ],
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using term buckets operation in an esql configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'datatable',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [{ operation: 'terms', fields: ['geo.dest'], size: 10 }],
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid sorting index', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'metric',
          index: 2,
          direction: 'desc',
        },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid sorting index for pivoted_metric', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'pivoted_metric',
          index: 2,
          values: ['success'],
          direction: 'desc',
        },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });

    it('throws when using invalid values length for pivoted_metric', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            size: 5,
          },
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'pivoted_metric',
          index: 2,
          values: ['success'],
          direction: 'desc',
        },
      };

      expect(() => datatableStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full datatable configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        density: {
          mode: 'compact',
          height: {
            header: { type: 'auto' },
            value: { type: 'custom', lines: 2 },
          },
        },
        metrics: [
          {
            operation: 'median',
            field: 'bytes',
            alignment: 'left',
            apply_color_to: 'background',
            visible: true,
            width: 200,
            summary: { type: 'avg', label: 'Average bytes' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                {
                  type: 'from',
                  from: 0,
                  color: '#000000',
                },
              ],
            },
          },
          {
            operation: 'average',
            field: 'bytes',
          },
        ],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
          {
            operation: 'terms',
            fields: ['geo.dest'],
            size: 10,
            alignment: 'right',
            width: 100,
            apply_color_to: 'value',
            visible: true,
            click_filter: true,
            collapse_by: 'avg',
            color: {
              mode: 'categorical',
              palette: 'palette_name',
              mapping: [
                {
                  values: ['value1', 'value2', 'value3'],
                  color: {
                    type: 'colorCode',
                    value: '#000000',
                  },
                },
              ],
            },
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            size: 5,
          },
        ],
        sort_by: {
          column_type: 'metric',
          index: 0,
          direction: 'asc',
        },
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates esql configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'datatable',
        title: 'Datatable',
        description: 'ESQL table full configuration',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        density: {
          mode: 'compact',
          height: {
            header: { type: 'auto' },
            value: { type: 'custom', lines: 2 },
          },
        },
        metrics: [
          {
            operation: 'value',
            column: 'avg_bytes',
            alignment: 'left',
            apply_color_to: 'background',
            visible: true,
            summary: { type: 'avg' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                {
                  type: 'from',
                  from: 0,
                  color: '#000000',
                },
              ],
            },
          },
          {
            operation: 'value',
            column: 'median_bytes',
            alignment: 'center',
            apply_color_to: 'value',
            visible: true,
            summary: { type: 'sum' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                {
                  type: 'from',
                  from: 0,
                  color: '#000000',
                },
              ],
            },
          },
        ],
        rows: [
          {
            operation: 'value',
            column: 'location',
            alignment: 'right',
            apply_color_to: 'value',
            visible: true,
            click_filter: true,
            collapse_by: 'avg',
            color: {
              mode: 'categorical',
              palette: 'palette_name',
              mapping: [
                {
                  values: ['value1', 'value2', 'value3'],
                  color: {
                    type: 'colorCode',
                    value: '#000000',
                  },
                },
              ],
            },
          },
        ],
        split_metrics_by: [
          {
            operation: 'value',
            column: 'api',
          },
        ],
      };

      const validated = datatableStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
