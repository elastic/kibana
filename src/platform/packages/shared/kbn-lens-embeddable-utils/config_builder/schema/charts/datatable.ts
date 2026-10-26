/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { DEFAULT_HEADER_ROW_HEIGHT_LINES, DEFAULT_ROW_HEIGHT_LINES } from '@kbn/lens-common';
import { esqlColumnWithFormatSchema } from '../metric_ops';
import {
  applyColorToSchema,
  colorByValueAbsoluteSchema,
  colorByValuePaletteSchema,
  colorByValuePercentageSchema,
  colorByValueSchema,
  colorMappingSchema,
  autoColorSchema,
  staticColorSchema,
  AUTO_COLOR,
} from '../color';
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
} from '../shared';
import {
  getMetricsWithChartDimensionSchemaWithRefBasedOps,
  getBucketsWithChartDimensionSchema,
} from './shared';
import { horizontalAlignmentSchema, leftRightAlignmentSchema } from '../alignments';
import { bucketOperationDefinitionSchema } from '../bucket_ops';
import { directionSchema } from '../enums';

/**
 * Datatable supports an additional "badge" mode (render colored values as badges),
 * so it uses a datatable-specific schema rather than the shared applyColorToSchema.
 */
const applyColorToDatatableSchema = lazySchema(() =>
  z.union([applyColorToSchema, z.literal('badge')]).meta({
    description:
      'Column color target: `value` for cell text, `background` for cell background, or `badge` for a badge overlay.',
  })
);

/**
 * Sorting configuration for the datatable. Only one column can be sorted at a time.
 */
const sortingSchema = lazySchema(() =>
  z
    .union([
      z
        .object({
          column_type: z
            .union([z.literal('metric'), z.literal('row')])
            .meta({ description: 'Type of column to sort by.' }),
          index: z
            .number()
            .min(0)
            .meta({ description: 'Index of the column or row to sort by (0-based).' }),
          direction: directionSchema.meta({ description: 'Sort direction.' }),
        })
        .strict()
        .meta({ description: 'Sort by a metric or row column' }),
      z
        .object({
          column_type: z.literal('pivoted_metric'),
          index: z.number().min(0).meta({
            description:
              '0-based index into the "metrics" array for the metric to sort; use "values" to identify the pivoted column',
          }),
          values: z.array(z.string()).min(1).max(20).meta({
            description: 'Array of pivot values, one for each split_metrics_by column in order',
          }),
          direction: directionSchema.meta({ description: 'Sort direction.' }),
        })
        .strict()
        .meta({
          description:
            'Sort by a pivoted metric column (created when metrics are pivoted by split_metrics_by)',
        }),
    ])
    .meta({
      description:
        'Sorting configuration. Only one column can be sorted at a time. Use "column_type" to specify the column type.',
    })
);

const visDatatableDensitySchema = lazySchema(() =>
  z
    .object({
      /**
       * Density mode
       */
      mode: z
        .union([z.literal('compact'), z.literal('default'), z.literal('expanded')])
        .default('default')
        .optional()
        .meta({ description: 'Display density mode.' }),
      /**
       * Height configuration
       */
      height: z
        .object({
          header: z
            .union([
              z.object({ type: z.literal('auto') }).strict(),
              z
                .object({
                  type: z.literal('custom'),
                  max_lines: z.number().min(1).max(5).default(DEFAULT_HEADER_ROW_HEIGHT_LINES),
                })
                .strict(),
            ])
            .optional()
            .meta({
              description: 'Number of lines before the header is truncated.',
            }),
          value: z
            .union([
              z.object({ type: z.literal('auto') }).strict(),
              z
                .object({
                  type: z.literal('custom'),
                  lines: z.number().min(1).max(20).default(DEFAULT_ROW_HEIGHT_LINES),
                })
                .strict(),
            ])
            .optional()
            .meta({
              description: 'Number of lines to display per table body cell.',
            }),
        })
        .strict()
        .optional(),
    })
    .strict()
    .optional()
    .meta({
      id: 'visDatatableDensity',
      description: 'Density configuration for the datatable.',
    })
);

const datatableStylingSchema = lazySchema(() =>
  z
    .object({
      /**
       * Density  configuration
       */
      density: visDatatableDensitySchema,
      /**
       * Paging configuration
       */
      paging: z
        .union([z.literal(10), z.literal(20), z.literal(30), z.literal(50), z.literal(100)])
        .optional()
        .meta({
          description:
            'Rows per page. When set, pagination is enabled with the specified number of rows.',
        }),
      /**
       * Sorting configuration
       */
      sort_by: sortingSchema.optional(),
      /**
       * Show row numbers
       */
      row_numbers: z
        .object({
          visible: z.boolean().meta({ description: 'When `true`, displays row numbers.' }),
        })
        .strict()
        .optional()
        .meta({
          description: 'Configuration for row numbers',
        }),
    })
    .strict()
    .meta({
      id: 'visDatatableStyling',
      title: 'Datatable styling',
      description: 'Visual chart styling options',
    })
);

const datatableConfigCommonOptionsSchema = lazySchema(() =>
  z
    .object({
      /**
       * Where to apply the color (background, value or badge)
       */
      apply_color_to: applyColorToDatatableSchema.optional(),
      /**
       * Show the column
       */
      visible: z
        .boolean()
        .default(true)
        .optional()
        .meta({ description: 'When `false`, hides the column from the datatable.' }),
      /**
       * Column width in pixels
       */
      width: z.number().min(0).optional().meta({ description: 'Column width in pixels.' }),
    })
    .strict()
);

const datatableConfigRowsOptionsNoESQLSchema = lazySchema(() =>
  datatableConfigCommonOptionsSchema.extend({
    /**
     * Alignment of the rows
     */
    alignment: horizontalAlignmentSchema.default('left').optional().meta({
      description: 'Alignment of the rows.',
    }),
    /**
     * Color configuration
     */
    color: z.union([colorMappingSchema, autoColorSchema]).default(AUTO_COLOR).optional(),
    /**
     * Whether to enable the one click filter
     */
    click_filter: z
      .boolean()
      .default(false)
      .optional()
      .meta({ description: 'When `true`, enables one-click filtering on cell values.' }),
    /**
     * Collapse by function. This parameter is used to collapse the
     * metric chart when the number of columns is bigger than the
     * number of columns specified in the columns parameter.
     */
    collapse_by: collapseBySchema.optional(),
  })
);

const datatableConfigRowsOptionsESQLSchema = lazySchema(() =>
  datatableConfigRowsOptionsNoESQLSchema.extend({
    /**
     * Color configuration
     */
    color: z
      .union([colorByValueSchema, colorMappingSchema, autoColorSchema])
      .default(AUTO_COLOR)
      .optional()
      .meta({
        description:
          'Color configuration for ESQL datatable rows. Use dynamic coloring for numeric data and categorical/gradient mode for categorical data.',
      }),
  })
);

const datatableConfigMetricsOptionsSchema = lazySchema(() =>
  datatableConfigCommonOptionsSchema.extend({
    /**
     * Color configuration
     */
    color: z
      .union([colorByValueSchema, colorMappingSchema, autoColorSchema])
      .default(AUTO_COLOR)
      .optional()
      .meta({
        description:
          'Color configuration for datatable metrics. Use dynamic coloring for numeric data and categorical/gradient mode for categorical data.',
      }),
    /**
     * Alignment of the columns
     */
    alignment: horizontalAlignmentSchema.default('right').optional().meta({
      description: 'Alignment of the columns.',
    }),
    /**
     * Summary configuration
     */
    summary: z
      .object({
        type: z
          .union([
            z.literal('sum'),
            z.literal('avg'),
            z.literal('count'),
            z.literal('min'),
            z.literal('max'),
          ])
          .meta({ description: 'Type of summary function to apply to the column.' }),
        label: z.string().optional().meta({ description: 'Summary row label.' }),
      })
      .strict()
      .optional()
      .meta({ description: 'Summary row configuration' }),
  })
);

const progressBarValueRangeSchema = lazySchema(() =>
  z
    .discriminatedUnion('type', [
      z
        .object({ type: z.literal('auto') })
        .strict()
        .meta({
          description: 'The bar spans the minimum to the maximum of the loaded values.',
        }),
      z
        .object({
          type: z.literal('custom'),
          min: z.number().meta({ description: 'Value at which the bar is empty.' }),
          max: z.number().meta({ description: 'Value at which the bar is full.' }),
        })
        .strict()
        .meta({
          description: 'Custom explicit bounds.',
        }),
    ])
    .meta({
      id: 'visDatatableProgressBarValueRange',
      title: 'Datatable progress bar value range',
      description: 'The numeric span the progress bar represents',
    })
);

/**
 * Progress bar variants of a column, one per fill mode, replacing its `apply_color_to`, `color` and `alignment` options.
 */
const getProgressBarVariants = <
  Shape extends z.ZodRawShape,
  Config extends z.core.$ZodObjectConfig
>(
  columnSchema: z.ZodObject<Shape, Config>
) => {
  const progressBarSchema = columnSchema.extend({
    apply_color_to: z.literal('progress_bar').meta({
      description:
        'Draws a horizontal bar beside the value, filled in proportion to where the value falls within `value_range`.',
    }),
    value_range: progressBarValueRangeSchema.default({ type: 'auto' }),
    alignment: leftRightAlignmentSchema
      .default('right')
      .meta({ description: 'Alignment of the value beside the bar.' }),
  });

  const paletteColorSchema = z
    .union([
      autoColorSchema,
      colorByValuePaletteSchema,
      colorByValueAbsoluteSchema,
      colorByValuePercentageSchema,
    ])
    .default(AUTO_COLOR)
    .meta({ description: 'Palette the bar takes its colors from.' });

  return [
    progressBarSchema.extend({
      fill_mode: z.literal('single').meta({ description: 'Fills the bar with one fixed color.' }),
      color: z
        .union([staticColorSchema, autoColorSchema])
        .default(AUTO_COLOR)
        .meta({ description: 'Bar color.' }),
    }),
    progressBarSchema.extend({
      fill_mode: z.literal('solid').meta({
        description: 'Fills the bar with the palette color of the band the value falls in.',
      }),
      color: paletteColorSchema,
    }),
    progressBarSchema.extend({
      fill_mode: z.literal('gradient').meta({ description: 'Reveals the palette along the bar.' }),
      color: paletteColorSchema,
    }),
  ] as const;
};

const datatableMetricOptionsSchema = lazySchema(() =>
  z.discriminatedUnion('apply_color_to', [
    datatableConfigMetricsOptionsSchema,
    z.discriminatedUnion('fill_mode', getProgressBarVariants(datatableConfigMetricsOptionsSchema)),
  ])
);

interface SortByValidationInput {
  metrics?: Array<{}>;
  rows?: Array<{}>;
  split_metrics_by?: Array<{}>;
  styling?: {
    sort_by?: {
      column_type: 'metric' | 'row' | 'pivoted_metric';
      index?: number;
      values?: string[];
    };
  };
}

function validateSortBy({
  metrics,
  rows,
  split_metrics_by,
  styling,
}: SortByValidationInput): string | undefined {
  if (!styling?.sort_by) {
    return;
  }

  const { column_type, index, values } = styling.sort_by;

  const numberOfMetrics = metrics?.length ?? 0;

  if (column_type === 'metric') {
    if (index == null || index >= numberOfMetrics) {
      return `The 'sort_by.index' (${index}) is out of bounds. The 'metrics' array has ${numberOfMetrics} item(s).`;
    }
  }

  if (column_type === 'row') {
    if (!rows || rows.length === 0) {
      return `Cannot sort by 'row' when no rows are defined.`;
    }

    if (index == null || index >= rows.length) {
      return `The 'sort_by.index' (${index}) is out of bounds. The 'rows' array has ${rows.length} item(s).`;
    }
  }

  if (column_type === 'pivoted_metric') {
    if (!split_metrics_by || split_metrics_by.length === 0) {
      return `Cannot sort by 'pivoted_metric' when no split_metrics_by columns are defined.`;
    }

    if (index == null || index >= numberOfMetrics) {
      return `The 'sort_by.index' (${index}) is out of bounds. The 'metrics' array has ${numberOfMetrics} item(s).`;
    }

    if (values == null || values.length !== split_metrics_by.length) {
      return `The 'sort_by.values' length (${values?.length}) must match the 'split_metrics_by' length (${split_metrics_by.length}).`;
    }
  }
}

export const datatableConfigSchemaNoESQL = lazySchema(() =>
  z
    .object({
      type: z.literal('data_table'),
      ...sharedPanelInfoSchema.shape,
      ...dslOnlyPanelInfoSchema.shape,
      ...layerSettingsSchema.shape,
      ...dataSourceSchema.shape,
      styling: datatableStylingSchema.optional(),
      /**
       * Metric columns configuration, must define operation.
       */
      metrics: z
        .array(
          getMetricsWithChartDimensionSchemaWithRefBasedOps('datatableMetric').and(
            datatableMetricOptionsSchema
          )
        )
        .min(1)
        .max(1000)
        .meta({ description: 'Array of metrics to display as columns in the datatable' }),
      /**
       * Row configuration, optional bucket operations.
       */
      rows: z
        .array(
          getBucketsWithChartDimensionSchema('datatableRow').and(
            datatableConfigRowsOptionsNoESQLSchema
          )
        )
        .min(1)
        .max(50)
        .optional()
        .meta({ description: 'Array of operations to split the datatable rows by' }),
      /**
       * Split metrics by configuration, optional bucket operations.
       */
      split_metrics_by: z
        .array(bucketOperationDefinitionSchema)
        .min(1)
        .max(20)
        .optional()
        .meta({ description: 'Array of operations to split the metric columns by' }),
    })
    .superRefine((data, ctx) => {
      const msg = validateSortBy(data);
      if (msg) {
        ctx.addIssue({ code: 'custom', message: msg });
      }
    })
    .meta({
      id: 'visDatatableNoESQL',
      title: 'Datatable (DSL)',
      description: 'Datatable state configuration for standard queries',
    })
);

const visDatatableESQLMetricSchema = lazySchema(() => {
  const metricSchema = esqlColumnWithFormatSchema.extend(datatableConfigMetricsOptionsSchema.shape);
  return z.discriminatedUnion('apply_color_to', [
    metricSchema.meta({ id: 'visDatatableESQLMetric', title: 'Datatable Metric (ES|QL)' }),
    z.discriminatedUnion('fill_mode', getProgressBarVariants(metricSchema)),
  ]);
});

const visDatatableESQLRowSchema = lazySchema(() => {
  const rowSchema = esqlColumnWithFormatSchema.extend(datatableConfigRowsOptionsESQLSchema.shape);
  return z.discriminatedUnion('apply_color_to', [
    rowSchema,
    z.discriminatedUnion('fill_mode', getProgressBarVariants(rowSchema)),
  ]);
});

export const datatableConfigSchemaESQL = lazySchema(() =>
  z
    .object({
      type: z.literal('data_table'),
      ...sharedPanelInfoSchema.shape,
      ...layerSettingsSchema.shape,
      ...dataSourceEsqlTableSchema.shape,
      styling: datatableStylingSchema.optional(),
      /**
       * Metric columns configuration, must define operation.
       */
      metrics: z
        .array(visDatatableESQLMetricSchema)
        .min(1)
        .max(1000)
        .optional()
        .meta({ description: 'Array of metrics to display as columns in the datatable' }),
      /**
       * Row configuration, optional operations.
       */
      rows: z
        .array(visDatatableESQLRowSchema)
        .min(1)
        .max(50)
        .optional()
        .meta({ description: 'Array of operations to split the datatable rows by' }),
      /**
       * Split metrics by configuration, optional operations.
       */
      split_metrics_by: z
        .array(esqlColumnWithFormatSchema)
        .min(1)
        .max(20)
        .optional()
        .meta({ description: 'Array of operations to split the metric columns by' }),
    })
    .superRefine((data, ctx) => {
      const sortByError = validateSortBy(data);
      if (sortByError) {
        ctx.addIssue({ code: 'custom', message: sortByError });
        return;
      }

      const { metrics, rows } = data;

      if (!metrics && !rows) {
        ctx.addIssue({
          code: 'custom',
          message: 'Datatable must have at least one column',
        });
      }
    })
    .meta({
      id: 'visDatatableESQL',
      title: 'Datatable (ES|QL)',
      description: 'Datatable state configuration for ES|QL queries',
    })
);

export const datatableConfigSchema = lazySchema(() =>
  z.union([datatableConfigSchemaNoESQL, datatableConfigSchemaESQL]).meta({
    id: 'visDatatableChart',
    title: 'Datatable',
    description: 'Datatable chart configuration: DSL or ES|QL query based',
  })
);

export type DatatableConfig = z.output<typeof datatableConfigSchema>;
export type DatatableConfigInput = z.input<typeof datatableConfigSchema>;
export type DatatableConfigNoESQL = z.output<typeof datatableConfigSchemaNoESQL>;
export type DatatableConfigESQL = z.output<typeof datatableConfigSchemaESQL>;
