/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { DEFAULT_HEADER_ROW_HEIGHT_LINES, DEFAULT_ROW_HEIGHT_LINES } from '@kbn/lens-common';
import { esqlColumnOperationWithLabelAndFormatSchema, esqlColumnSchema } from '../metric_ops';
import { applyColorToSchema, colorByValueSchema, colorMappingSchema } from '../color';
import { datasetSchema, datasetEsqlTableSchema } from '../dataset';
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  layerSettingsSchema,
  sharedPanelInfoSchema,
} from '../shared';
import {
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
  mergeAllBucketsWithChartDimensionSchema,
} from './shared';
import { horizontalAlignmentSchema } from '../alignments';
import { bucketOperationDefinitionSchema } from '../bucket_ops';

/**
 * Sorting configuration for the datatable. Only one column can be sorted at a time.
 */
const sortingSchema = schema.oneOf(
  [
    // Sorting for metric or row columns
    schema.object(
      {
        column_type: schema.oneOf([schema.literal('metric'), schema.literal('row')], {
          meta: { description: 'Type of column to sort by' },
        }),
        index: schema.number({
          min: 0,
          meta: { description: 'Index of the column/row to sort by (0-based)' },
        }),
        direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
          meta: { description: 'Sort direction' },
        }),
      },
      { meta: { description: 'Sort by a metric or row column' } }
    ),
    // Sorting for pivoted metric columns (created by split_metrics_by)
    schema.object(
      {
        column_type: schema.literal('pivoted_metric'),
        index: schema.number({
          min: 0,
          meta: {
            description:
              '0-based index into the "metrics" array for the metric to sort; use "values" to identify the pivoted column',
          },
        }),
        values: schema.arrayOf(schema.string(), {
          minSize: 1,
          maxSize: 20,
          meta: {
            description: 'Array of pivot values, one for each split_metrics_by column in order',
          },
        }),
        direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
          meta: { description: 'Sort direction' },
        }),
      },
      {
        meta: {
          description:
            'Sort by a pivoted metric column (created when metrics are pivoted by split_metrics_by)',
        },
      }
    ),
  ],
  {
    meta: {
      description:
        'Sorting configuration. Only one column can be sorted at a time. Use "column_type" to specify the column type.',
    },
  }
);

const datatableStateSharedOptionsSchema = {
  /**
   * Density  configuration
   */
  density: schema.maybe(
    schema.object(
      {
        /**
         * Density mode
         */
        mode: schema.maybe(
          schema.oneOf(
            [schema.literal('compact'), schema.literal('default'), schema.literal('expanded')],
            {
              defaultValue: 'default',
              meta: { description: 'Density mode' },
            }
          )
        ),
        /**
         * Height configuration
         */
        height: schema.maybe(
          schema.object({
            header: schema.maybe(
              schema.oneOf(
                [
                  schema.object({ type: schema.literal('auto') }),
                  schema.object({
                    type: schema.literal('custom'),
                    max_lines: schema.number({
                      defaultValue: DEFAULT_HEADER_ROW_HEIGHT_LINES,
                      min: 1,
                      max: 5,
                    }),
                  }),
                ],
                {
                  meta: {
                    description: 'Maximum number of lines to use before header is truncated',
                  },
                }
              )
            ),
            value: schema.maybe(
              schema.oneOf(
                [
                  schema.object({ type: schema.literal('auto') }),
                  schema.object({
                    type: schema.literal('custom'),
                    lines: schema.number({
                      defaultValue: DEFAULT_ROW_HEIGHT_LINES,
                      min: 1,
                      max: 20,
                    }),
                  }),
                ],
                {
                  meta: {
                    description: 'Number of lines to display per table body cell',
                  },
                }
              )
            ),
          })
        ),
      },
      {
        meta: {
          id: 'datatableDensity',
          description: 'Density configuration for the datatable',
        },
      }
    )
  ),
  /**
   * Paging configuration
   */
  paging: schema.maybe(
    schema.oneOf(
      [
        schema.literal(10),
        schema.literal(20),
        schema.literal(30),
        schema.literal(50),
        schema.literal(100),
      ],
      {
        meta: {
          description: 'Enables pagination and sets the number of rows to display per page',
        },
      }
    )
  ),
  /**
   * Sorting configuration
   */
  sort_by: schema.maybe(sortingSchema),
};

const datatableStateCommonOptionsSchema = {
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
  /**
   * Whether to show the column
   */
  visible: schema.maybe(schema.boolean({ defaultValue: true })),
  /**
   * Column width in pixels
   */
  width: schema.maybe(
    schema.number({
      min: 0,
      meta: { description: 'Column width in pixels' },
    })
  ),
};

const datatableStateRowsOptionsNoESQLSchema = {
  ...datatableStateCommonOptionsSchema,
  /**
   * Alignment of the rows
   */
  alignment: schema.maybe(
    horizontalAlignmentSchema({
      defaultValue: 'left',
      meta: { description: 'Alignment of the rows' },
    })
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(colorMappingSchema),
  /**
   * Whether to enable the one click filter
   */
  click_filter: schema.maybe(
    schema.boolean({
      defaultValue: false,
      meta: { description: 'Whether to enable the one click filter' },
    })
  ),
  /**
   * Collapse by function. This parameter is used to collapse the
   * metric chart when the number of columns is bigger than the
   * number of columns specified in the columns parameter.
   */
  collapse_by: schema.maybe(collapseBySchema),
};

const datatableStateRowsOptionsESQLSchema = {
  ...datatableStateRowsOptionsNoESQLSchema,
  /**
   * Color configuration
   */
  color: schema.maybe(
    schema.oneOf([colorByValueSchema, colorMappingSchema], {
      meta: {
        description:
          'Color configuration for ESQL datatable rows. Use dynamic coloring for numeric data and categorical/gradient mode for categorical data.',
      },
    })
  ),
};

const datatableStateMetricsOptionsSchema = {
  ...datatableStateCommonOptionsSchema,
  /**
   * Color configuration
   */
  color: schema.maybe(
    schema.oneOf([colorByValueSchema, colorMappingSchema], {
      meta: {
        description:
          'Color configuration for datatable metrics. Use dynamic coloring for numeric data and categorical/gradient mode for categorical data.',
      },
    })
  ),
  /**
   * Alignment of the columns
   */
  alignment: schema.maybe(
    horizontalAlignmentSchema({
      defaultValue: 'right',
      meta: { description: 'Alignment of the columns' },
    })
  ),
  /**
   * Summary configuration
   */
  summary: schema.maybe(
    schema.object(
      {
        type: schema.oneOf(
          [
            schema.literal('sum'),
            schema.literal('avg'),
            schema.literal('count'),
            schema.literal('min'),
            schema.literal('max'),
          ],
          { meta: { description: 'Type of summary function to apply to the column' } }
        ),
        label: schema.maybe(schema.string({ meta: { description: 'Summary row label' } })),
      },
      { meta: { description: 'Summary row configuration' } }
    )
  ),
};

interface SortByValidationInput {
  metrics: Array<{}>;
  rows?: Array<{}>;
  split_metrics_by?: Array<{}>;
  sort_by?: {
    column_type: 'metric' | 'row' | 'pivoted_metric';
    index?: number;
    values?: string[];
  };
}

function validateSortBy({
  metrics,
  rows,
  split_metrics_by,
  sort_by,
}: SortByValidationInput): string | undefined {
  if (!sort_by) {
    return;
  }

  const { column_type, index, values } = sort_by;

  if (column_type === 'metric') {
    if (index == null || index >= metrics.length) {
      return `The 'sort_by.index' (${index}) is out of bounds. The 'metrics' array has ${metrics.length} item(s).`;
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

    if (index == null || index >= metrics.length) {
      return `The 'sort_by.index' (${index}) is out of bounds. The 'metrics' array has ${metrics.length} item(s).`;
    }

    if (values == null || values.length !== split_metrics_by.length) {
      return `The 'sort_by.values' length (${values?.length}) must match the 'split_metrics_by' length (${split_metrics_by.length}).`;
    }
  }
}

export const datatableStateSchemaNoESQL = schema.object(
  {
    type: schema.literal('datatable'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetSchema,
    ...datatableStateSharedOptionsSchema,
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(datatableStateMetricsOptionsSchema),
      {
        minSize: 1,
        maxSize: 1000,
        meta: { description: 'Array of metrics to display as columns in the datatable' },
      }
    ),
    /**
     * Row configuration, optional bucket operations.
     */
    rows: schema.maybe(
      schema.arrayOf(
        mergeAllBucketsWithChartDimensionSchema(datatableStateRowsOptionsNoESQLSchema),
        {
          minSize: 1,
          maxSize: 50,
          meta: { description: 'Array of operations to split the datatable rows by' },
        }
      )
    ),
    /**
     * Split metrics by configuration, optional bucket operations.
     */
    split_metrics_by: schema.maybe(
      schema.arrayOf(bucketOperationDefinitionSchema, {
        minSize: 1,
        maxSize: 20,
        meta: { description: 'Array of operations to split the metric columns by' },
      })
    ),
  },
  {
    validate: validateSortBy,
    meta: {
      id: 'datatableNoESQL',
      description: 'Datatable state configuration for standard queries',
    },
  }
);

export const datatableStateSchemaESQL = schema.object(
  {
    type: schema.literal('datatable'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...datatableStateSharedOptionsSchema,
    /**
     * Metric columns configuration, must define operation.
     */
    metrics: schema.arrayOf(
      esqlColumnOperationWithLabelAndFormatSchema.extends(datatableStateMetricsOptionsSchema, {
        meta: { id: 'datatableESQLMetric' },
      }),
      {
        minSize: 1,
        maxSize: 1000,
        meta: { description: 'Array of metrics to display as columns in the datatable' },
      }
    ),
    /**
     * Row configuration, optional operations.
     */
    rows: schema.maybe(
      schema.arrayOf(esqlColumnSchema.extends(datatableStateRowsOptionsESQLSchema), {
        minSize: 1,
        maxSize: 50,
        meta: { description: 'Array of operations to split the datatable rows by' },
      })
    ),
    /**
     * Split metrics by configuration, optional operations.
     */
    split_metrics_by: schema.maybe(
      schema.arrayOf(esqlColumnSchema, {
        minSize: 1,
        maxSize: 20,
        meta: { description: 'Array of operations to split the metric columns by' },
      })
    ),
  },
  {
    validate: validateSortBy,
    meta: {
      id: 'datatableESQL',
      description: 'Datatable state configuration for ES|QL queries',
    },
  }
);

export const datatableStateSchema = schema.oneOf(
  [datatableStateSchemaNoESQL, datatableStateSchemaESQL],
  {
    meta: {
      description: 'Datatable chart configuration: DSL or ES|QL query based',
      id: 'datatableChartSchema',
    },
  }
);

export type DatatableState = TypeOf<typeof datatableStateSchema>;
export type DatatableStateNoESQL = TypeOf<typeof datatableStateSchemaNoESQL>;
export type DatatableStateESQL = TypeOf<typeof datatableStateSchemaESQL>;
