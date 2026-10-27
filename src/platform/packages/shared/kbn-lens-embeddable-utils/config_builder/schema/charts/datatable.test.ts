/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { expectPrettyError } from '@kbn/zod-helpers/v4';
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { ColorByValueType, ColorMappingType } from '../color';
import { AUTO_COLOR } from '../color';
import type { DatatableConfig, DatatableConfigInput } from './datatable';
import { datatableConfigSchema } from './datatable';

type DefaultDatatableConfig = Pick<DatatableConfig, 'sampling' | 'ignore_global_filters'>;
type DatatableWithoutDefaultsConfig = Omit<DatatableConfig, 'sampling' | 'ignore_global_filters'>;

describe('Datatable Schema', () => {
  const baseDatatableConfig: Omit<DatatableWithoutDefaultsConfig, 'metrics'> = {
    type: 'data_table',
    data_source: {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'test-data-view',
    },
  };

  const defaultValues: DefaultDatatableConfig = {
    sampling: 1,
    ignore_global_filters: false,
  };

  type InvalidMetricsConfig<Metric> = Omit<DatatableWithoutDefaultsConfig, 'metrics'> & {
    metrics: Metric[];
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

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            limit: 5,
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'metric',
            index: 1,
            direction: 'desc',
          },
        },
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['api'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'row',
            index: 1,
            direction: 'desc',
          },
        },
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'pivoted_metric',
            index: 1,
            values: ['success'],
            direction: 'desc',
          },
        },
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            limit: 5,
          },
          {
            operation: 'terms',
            fields: ['product'],
            limit: 3,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'pivoted_metric',
            index: 0,
            values: ['success1', 'success2'],
            direction: 'desc',
          },
        },
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('validates progress bars with each fill mode', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            color: { type: 'static', color: '#abcdef' },
            value_range: { type: 'custom', min: -20, max: 100 },
            alignment: 'left',
          },
          {
            operation: 'median',
            field: 'bytes',
            apply_color_to: 'progress_bar',
            fill_mode: 'solid',
            color: { type: 'distributed_palette', palette: 'status' },
            value_range: { type: 'auto' },
            alignment: 'right',
          },
          {
            operation: 'average',
            field: 'bytes',
            apply_color_to: 'progress_bar',
            fill_mode: 'gradient',
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                { lt: 30, color: '#54B399' },
                { gte: 30, color: '#E7664C' },
              ],
            },
            value_range: { type: 'auto' },
            alignment: 'right',
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('validates progress bars on esql metrics and rows', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [
          {
            column: 'bytes',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            color: AUTO_COLOR,
            value_range: { type: 'auto' },
            alignment: 'right',
          },
        ],
        rows: [
          {
            column: 'memory',
            apply_color_to: 'progress_bar',
            fill_mode: 'gradient',
            color: { type: 'distributed_palette', palette: 'status' },
            value_range: { type: 'custom', min: 0, max: 100 },
            alignment: 'left',
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('validates a custom value range with zero bounds', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            color: AUTO_COLOR,
            value_range: { type: 'custom', min: 0, max: 0 },
            alignment: 'right',
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('applies the progress bar defaults on metrics and rows', () => {
      const input: DatatableConfigInput = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [{ column: 'bytes', apply_color_to: 'progress_bar', fill_mode: 'single' }],
        rows: [{ column: 'memory', apply_color_to: 'progress_bar', fill_mode: 'gradient' }],
      };

      const validated = datatableConfigSchema.parse(input);
      const progressBarDefaults = {
        color: AUTO_COLOR,
        value_range: { type: 'auto' },
        alignment: 'right',
      };
      expect(validated.metrics?.[0]).toMatchObject(progressBarDefaults);
      expect(validated.rows?.[0]).toMatchObject(progressBarDefaults);
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
            limit: 10,
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws on empty metrics for non-esql', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        metrics: [],
        rows: [
          {
            operation: 'date_histogram',
            field: '@timestamp',
            suggested_interval: '1d',
            use_original_time_range: true,
            include_empty_rows: true,
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected array to have >=1 items
          → at metrics"
      `);
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
            limit: 5,
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected array to have >=1 items
          → at rows"
      `);
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

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected array to have >=1 items
          → at split_metrics_by"
      `);
    });

    it('throws when using invalid density height type', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'styling'> & {
        styling: { density: { height: { header: { type: 'invalid' } } } };
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
        styling: {
          density: {
            height: {
              header: { type: 'invalid' },
            },
          },
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when using invalid density mode', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'styling'> & {
        styling: { density: { mode: 'invalid' } };
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
        styling: {
          density: {
            mode: 'invalid',
          },
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when using invalid height type', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'styling'> & {
        styling: { density: { height: { header: { type: 'invalid' } } } };
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
        styling: { density: { height: { header: { type: 'invalid' } } } },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
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

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when using term buckets operation in an esql configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'data_table',
        data_source: {
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
        rows: [{ operation: 'terms', fields: ['geo.dest'], limit: 10 }],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when esql datatable has no metrics and no rows', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'metrics' | 'rows'> = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(
        `"✖ Datatable must have at least one column"`
      );
    });

    it('throws on empty metrics array for esql', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [],
        rows: [
          {
            column: 'location',
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected array to have >=1 items
          → at metrics"
      `);
    });

    it('throws on empty rows array for esql', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metrics: [
          {
            column: 'bytes',
          },
        ],
        rows: [],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Too small: expected array to have >=1 items
          → at rows"
      `);
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'metric',
            index: 2,
            direction: 'desc',
          },
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(
        `"✖ The 'sort_by.index' (2) is out of bounds. The 'metrics' array has 2 item(s)."`
      );
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'pivoted_metric',
            index: 2,
            values: ['success'],
            direction: 'desc',
          },
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(
        `"✖ The 'sort_by.index' (2) is out of bounds. The 'metrics' array has 2 item(s)."`
      );
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
            limit: 10,
          },
        ],
        split_metrics_by: [
          {
            operation: 'terms',
            fields: ['status'],
            limit: 5,
          },
          {
            operation: 'terms',
            fields: ['api'],
            limit: 5,
          },
        ],
        styling: {
          sort_by: {
            column_type: 'pivoted_metric',
            index: 2,
            values: ['success'],
            direction: 'desc',
          },
        },
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(
        `"✖ The 'sort_by.index' (2) is out of bounds. The 'metrics' array has 2 item(s)."`
      );
    });

    it('throws when the fill_mode is missing', () => {
      const input: InvalidMetricsConfig<{ operation: 'count'; apply_color_to: 'progress_bar' }> = {
        ...baseDatatableConfig,
        metrics: [{ operation: 'count', apply_color_to: 'progress_bar' }],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when the fill_mode is unknown', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'unknown';
      }> = {
        ...baseDatatableConfig,
        metrics: [{ operation: 'count', apply_color_to: 'progress_bar', fill_mode: 'unknown' }],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a solid fill has a static color', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'solid';
        color: { type: 'static'; color: string };
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'solid',
            color: { type: 'static', color: '#abcdef' },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a gradient fill has a static color', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'gradient';
        color: { type: 'static'; color: string };
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'gradient',
            color: { type: 'static', color: '#abcdef' },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a single fill has a distributed palette', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'single';
        color: { type: 'distributed_palette'; palette: string };
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            color: { type: 'distributed_palette', palette: 'status' },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a single fill has a dynamic color', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'single';
        color: ColorByValueType;
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [{ lt: 30, color: '#54B399' }],
            },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a progress bar has a color mapping', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'gradient';
        color: ColorMappingType;
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'gradient',
            color: { mode: 'categorical', palette: 'default', mapping: [] },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a progress bar is center aligned', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'single';
        alignment: 'center';
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            alignment: 'center',
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when a custom value range is missing a bound', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'single';
        value_range: { type: 'custom'; min: number };
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            value_range: { type: 'custom', min: 0 },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });

    it('throws when an auto value range has bounds', () => {
      const input: InvalidMetricsConfig<{
        operation: 'count';
        apply_color_to: 'progress_bar';
        fill_mode: 'single';
        value_range: { type: 'auto'; min: number; max: number };
      }> = {
        ...baseDatatableConfig,
        metrics: [
          {
            operation: 'count',
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
            value_range: { type: 'auto', min: 0, max: 100 },
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Unrecognized keys: \\"min\\", \\"max\\"
          → at metrics[0].value_range"
      `);
    });

    it('throws when a progress bar is applied to a dsl row', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'rows'> & {
        rows: Array<{
          operation: 'terms';
          fields: string[];
          limit: number;
          apply_color_to: 'progress_bar';
          fill_mode: 'single';
        }>;
      } = {
        ...baseDatatableConfig,
        metrics: [{ operation: 'count', empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE }],
        rows: [
          {
            operation: 'terms',
            fields: ['geo.dest'],
            limit: 10,
            apply_color_to: 'progress_bar',
            fill_mode: 'single',
          },
        ],
      };

      const result = datatableConfigSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`"✖ Invalid input"`);
    });
  });

  describe('complex configurations', () => {
    it('validates full datatable configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        ...baseDatatableConfig,
        styling: {
          density: {
            mode: 'compact',
            height: {
              header: { type: 'auto' },
              value: { type: 'custom', lines: 2 },
            },
          },
          sort_by: {
            column_type: 'metric',
            index: 0,
            direction: 'asc',
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
                  lt: 0,
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
            limit: 10,
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
                    type: 'color_code',
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
            limit: 5,
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('validates esql configuration', () => {
      const input: DatatableWithoutDefaultsConfig = {
        type: 'data_table',
        title: 'Datatable',
        description: 'ESQL table full configuration',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        styling: {
          density: {
            mode: 'compact',
            height: {
              header: { type: 'auto' },
              value: { type: 'custom', lines: 2 },
            },
          },
        },
        metrics: [
          {
            column: 'avg_bytes',
            alignment: 'left',
            apply_color_to: 'badge',
            visible: true,
            summary: { type: 'avg' },
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                {
                  lt: 0,
                  color: '#000000',
                },
              ],
            },
          },
          {
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
                  lt: 0,
                  color: '#000000',
                },
              ],
            },
          },
        ],
        rows: [
          {
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
                    type: 'color_code',
                    value: '#000000',
                  },
                },
              ],
            },
          },
        ],
        split_metrics_by: [
          {
            column: 'api',
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });

    it('allows no metrics when using esql', () => {
      const input: Omit<DatatableWithoutDefaultsConfig, 'metrics'> = {
        type: 'data_table',
        title: 'Datatable',
        description: 'ESQL table without metrics',
        data_source: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        rows: [
          {
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
                    type: 'color_code',
                    value: '#000000',
                  },
                },
              ],
            },
          },
        ],
      };

      const validated = datatableConfigSchema.parse(input);
      expect(validated).toMatchObject({ ...defaultValues, ...input });
    });
  });
});
