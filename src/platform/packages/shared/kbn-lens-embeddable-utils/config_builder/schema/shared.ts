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
import {
  LENS_SAMPLING_MIN_VALUE,
  LENS_SAMPLING_MAX_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
} from './constants';
import { filterSchema, unifiedSearchFilterSchema } from './filter';

export const labelSharedProp = {
  /**
   * Label for the operation
   */
  label: schema.maybe(
    schema.string({
      meta: {
        description: 'Label for the operation',
      },
    })
  ),
};

export const sharedPanelInfoSchema = {
  /**
   * The title of the chart displayed in the panel.
   *
   * Optional. If not provided, the chart will not have a title.
   *
   * Possible values: Any string value, or undefined if omitted.
   */
  title: schema.maybe(
    schema.string({
      meta: {
        description:
          'The title of the chart displayed in the panel. Optional. Any string value or undefined.',
      },
    })
  ),
  /**
   * The description of the chart, providing additional context or information.
   *
   * Optional. If not provided, the chart will not have a description.
   *
   * Possible values: Any string value, or undefined if omitted.
   */
  description: schema.maybe(
    schema.string({
      meta: {
        description: 'The description of the chart. Optional. Any string value or undefined.',
      },
    })
  ),
  filters: schema.maybe(schema.arrayOf(unifiedSearchFilterSchema, { maxSize: 100 })),
};

export const dslOnlyPanelInfoSchema = {
  // ES|QL chart should not have the ability to define a KQL/Lucene query
  query: schema.maybe(filterSchema),
};

export const ignoringGlobalFiltersSchemaRaw = {
  /**
   * Whether to ignore global filters when fetching data for this layer.
   *
   * If true, global filters (such as those set in the dashboard or application context) will be ignored for this layer.
   * If false, global filters will be applied.
   *
   * Default: false
   * Possible values: boolean (true or false)
   */
  ignore_global_filters: schema.boolean({
    defaultValue: LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
    meta: {
      description:
        'If true, ignore global filters when fetching data for this layer. Default is false.',
    },
  }),
};

export const layerSettingsSchema = {
  /**
   * The sampling factor for the dataset.
   *
   * Determines the proportion of the dataset to be used. Must be a number between 0 and 1 (inclusive).
   * - 0: No sampling (use none of the data)
   * - 1: Full sampling (use all data)
   * - Any value between 0 and 1: Use that proportion of the data
   *
   * Default: 1
   * Possible values: number (0 <= value <= 1)
   */
  sampling: schema.number({
    min: LENS_SAMPLING_MIN_VALUE,
    max: LENS_SAMPLING_MAX_VALUE,
    defaultValue: LENS_SAMPLING_DEFAULT_VALUE,
    meta: {
      description: 'Sampling factor between 0 (no sampling) and 1 (full sampling). Default is 1.',
    },
  }),
  ...ignoringGlobalFiltersSchemaRaw,
};

export const collapseBySchema = schema.oneOf(
  [
    /**
     * Average collapsed by average function
     */
    schema.literal('avg'),
    /**
     * Sum collapsed by sum function
     */
    schema.literal('sum'),
    /**
     * Max collapsed by max function
     */
    schema.literal('max'),
    /**
     * Min collapsed by min function
     */
    schema.literal('min'),
  ],
  {
    meta: {
      id: 'collapseBy',
      description: 'Collapse by function description',
    },
  }
);

export type CollapseBySchema = TypeOf<typeof collapseBySchema>;

const layerSettingsSchemaWrapped = schema.object(layerSettingsSchema);

export type LayerSettingsSchema = TypeOf<typeof layerSettingsSchemaWrapped>;

export const axisTitleSchemaProps = {
  value: schema.maybe(
    schema.string({ defaultValue: '', meta: { description: 'Axis title text' } })
  ),
  visible: schema.maybe(schema.boolean({ meta: { description: 'Whether to show the title' } })),
};

export const legendTruncateAfterLinesSchema = schema.maybe(
  schema.number({
    defaultValue: 1,
    min: 1,
    max: 10,
    meta: {
      description: 'Maximum lines before truncating legend items (1-10)',
      id: 'legendTruncateAfterLines',
    },
  })
);
