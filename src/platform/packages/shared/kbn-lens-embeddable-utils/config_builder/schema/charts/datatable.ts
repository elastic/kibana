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
import { esqlColumnSchema, genericOperationOptionsSchema } from '../metric_ops';
import { bucketOperationDefinitionSchema } from '../bucket_ops';
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
      [schema.literal(10), schema.literal(20), schema.literal(50), schema.literal(100)],
      {
        meta: {
          description: 'Enables pagination and sets the number of rows to display per page',
        },
      }
    )
  ),
};

const datatableStateCommonOptionsSchema = {
  /**
   * Where to apply the color (background or value)
   */
  apply_color_to: schema.maybe(applyColorToSchema),
  /**
   * Whether to show the row
   */
  visible: schema.maybe(schema.boolean({ defaultValue: true })),
};

const datatableStateRowsOptionsSchema = schema.object({
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
});

const datatableStateMetricsOptionsSchema = schema.object({
  ...datatableStateCommonOptionsSchema,
  /**
   * Color configuration
   */
  color: schema.maybe(colorByValueSchema),
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
});

export const datatableStateSchemaNoESQL = schema.object({
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
    schema.arrayOf(mergeAllBucketsWithChartDimensionSchema(datatableStateRowsOptionsSchema), {
      minSize: 1,
      maxSize: 1000,
      meta: { description: 'Array of operations to split the datatable rows by' },
    })
  ),
  /**
   * Split metrics by configuration, optional bucket operations.
   */
  split_metrics_by: schema.maybe(
    schema.arrayOf(bucketOperationDefinitionSchema, {
      minSize: 1,
      maxSize: 1000,
      meta: { description: 'Array of operations to split the metric columns by' },
    })
  ),
});

export const datatableStateSchemaESQL = schema.object({
  type: schema.literal('datatable'),
  ...sharedPanelInfoSchema,
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...datatableStateSharedOptionsSchema,
  /**
   * Metric columns configuration, must define operation.
   */
  metrics: schema.arrayOf(
    schema.allOf([
      schema.object({
        ...genericOperationOptionsSchema,
      }),
      datatableStateMetricsOptionsSchema,
      esqlColumnSchema,
    ]),
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
    schema.arrayOf(schema.allOf([datatableStateRowsOptionsSchema, esqlColumnSchema]), {
      minSize: 1,
      maxSize: 1000,
      meta: { description: 'AArray of operations to split the datatable rows by' },
    })
  ),
  /**
   * Split metrics by configuration, optional operations.
   */
  split_metrics_by: schema.maybe(
    schema.arrayOf(esqlColumnSchema, {
      minSize: 1,
      maxSize: 1000,
      meta: { description: 'Array of operations to split the metric columns by' },
    })
  ),
});

export const datatableStateSchema = schema.oneOf([
  datatableStateSchemaNoESQL,
  datatableStateSchemaESQL,
]);

export type DatatableState = TypeOf<typeof datatableStateSchema>;
export type DatatableStateNoESQL = TypeOf<typeof datatableStateSchemaNoESQL>;
export type DatatableStateESQL = TypeOf<typeof datatableStateSchemaESQL>;
