/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { filterWithLabelSchema } from './filter';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_HISTOGRAM_GRANULARITY_MAX,
  LENS_HISTOGRAM_GRANULARITY_MIN,
  LENS_TERMS_SIZE_DEFAULT,
  LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
  LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
} from './constants';
import { formatSchema } from './format';
import { labelSharedProp } from './shared';

export const bucketDateHistogramOperationSchema = schema.object(
  {
    /**
     * Select bucket operation type
     */
    operation: schema.literal('date_histogram'),
    ...labelSharedProp,
    /**
     * Field to be used for the date histogram
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the date histogram',
      },
    }),
    /**
     * Suggested interval
     */
    suggested_interval: schema.string({
      defaultValue: LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
      meta: {
        description: 'Suggested interval',
      },
    }),
    /**
     * Whether to use original time range
     */
    use_original_time_range: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      meta: {
        description: 'Whether to use original time range',
      },
    }),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      meta: {
        description: 'Whether to include empty rows',
      },
    }),
    drop_partial_intervals: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Whether to drop partial intervals',
        },
      })
    ),
  },
  { meta: { id: 'dateHistogramOperationSchema' } }
);

export const bucketTermsOperationSchema = schema.object(
  {
    operation: schema.literal('terms'),
    ...formatSchema,
    ...labelSharedProp,
    /**
     * Fields to be used for the terms
     */
    fields: schema.arrayOf(
      schema.string({
        meta: {
          description: 'Fields to be used for the terms',
        },
      }),
      { minSize: 1, maxSize: 4 }
    ),
    /**
     * Size of the terms
     */
    size: schema.number({
      defaultValue: LENS_TERMS_SIZE_DEFAULT,
      meta: { description: 'Size of the terms' },
    }),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: schema.maybe(
      schema.boolean({
        meta: {
          description: 'Whether to increase accuracy',
        },
      })
    ),
    /**
     * Includes
     */
    includes: schema.maybe(
      schema.object({
        values: schema.arrayOf(
          schema.string({
            meta: {
              description: 'Values to include',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'Whether to use regex',
            },
          })
        ),
      })
    ),
    /**
     * Excludes
     */
    excludes: schema.maybe(
      schema.object({
        values: schema.arrayOf(
          schema.string({
            meta: {
              description: 'Values to exclude',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'Whether to use regex',
            },
          })
        ),
      })
    ),
    /**
     * Other bucket
     */
    other_bucket: schema.maybe(
      schema.object({
        include_documents_without_field: schema.boolean({
          meta: {
            description: 'Whether to include documents without field',
          },
        }),
      })
    ),
    /**
     * Rank by
     */
    rank_by: schema.maybe(
      schema.oneOf([
        schema.object({
          type: schema.literal('alphabetical'),
          /**
           * Direction of the alphabetical order
           */
          direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
        }),
        schema.object({
          type: schema.literal('rare'),
          /**
           * Maximum number of rare terms
           */
          max: schema.number({
            meta: {
              description: 'Maximum number of rare terms',
            },
          }),
        }),
        schema.object({
          type: schema.literal('significant'),
        }),
        schema.object({
          type: schema.literal('column'),
          /**
           * Metric to be used for the column by index number (0 based)
           */
          metric: schema.number({
            meta: {
              description: 'Metric to be used for the column by index number (0 based)',
            },
          }),
          /**
           * Direction of the column
           */
          direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
        }),
        schema.object({
          type: schema.literal('custom'),
          /**
           * Operation type
           * @TODO handle the different param options for some of these operations
           */
          operation: schema.oneOf([
            schema.literal('min'),
            schema.literal('max'),
            schema.literal('average'),
            schema.literal('median'),
            schema.literal('standard_deviation'),
            schema.literal('unique_count'),
            schema.literal('percentile'),
            schema.literal('percentile_rank'),
            schema.literal('count'),
            schema.literal('sum'),
            schema.literal('last_value'),
          ]),
          /**
           * Field to be used for the custom operation
           */
          field: schema.string({
            meta: {
              description: 'Field to be used for the custom operation',
            },
          }),
          /**
           * Direction of the custom operation
           */
          direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
        }),
      ])
    ),
  },
  { meta: { id: 'termsOperationSchema' } }
);

export const bucketFiltersOperationSchema = schema.object(
  {
    operation: schema.literal('filters'),
    ...labelSharedProp,
    /**
     * Filters
     */
    filters: schema.arrayOf(filterWithLabelSchema, { maxSize: 100 }),
  },
  { meta: { id: 'filtersOperationSchema' } }
);

export const bucketHistogramOperationSchema = schema.object(
  {
    operation: schema.literal('histogram'),
    ...formatSchema,
    ...labelSharedProp,
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
    /**
     * Field to be used for the histogram
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the histogram',
      },
    }),
    /**
     * Granularity of the histogram
     */
    granularity: schema.oneOf(
      [
        schema.number({
          meta: {
            description: 'Granularity of the histogram',
          },
          min: LENS_HISTOGRAM_GRANULARITY_MIN,
          max: LENS_HISTOGRAM_GRANULARITY_MAX,
        }),
        schema.literal('auto'),
      ],
      {
        defaultValue: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
      }
    ),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.boolean({
      meta: {
        description: 'Whether to include empty rows',
      },
      defaultValue: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
    }),
  },
  { meta: { id: 'histogramOperationSchema' } }
);

export const bucketRangesOperationSchema = schema.object({
  operation: schema.literal('range'),
  ...formatSchema,
  ...labelSharedProp,
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
  /**
   * Field to be used for the range
   */
  field: schema.string({
    meta: {
      description: 'Field to be used for the range',
    },
  }),
  /**
   * Ranges
   */
  ranges: schema.arrayOf(
    schema.object({
      /**
       * Less than or equal to
       */
      lte: schema.maybe(
        schema.number({
          meta: {
            description: 'Less than or equal to',
          },
        })
      ),
      /**
       * Greater than
       */
      gt: schema.maybe(
        schema.number({
          meta: {
            description: 'Greater than',
          },
        })
      ),
      /**
       * Label
       */
      label: schema.maybe(
        schema.string({
          meta: {
            description: 'Label',
          },
        })
      ),
    }),
    { maxSize: 100, meta: { id: 'rangesOperationSchema' } }
  ),
});

export const bucketOperationDefinitionSchema = schema.oneOf([
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
]);

export type LensApiDateHistogramOperation = typeof bucketDateHistogramOperationSchema.type;
export type LensApiTermsOperation = typeof bucketTermsOperationSchema.type;
export type LensApiHistogramOperation = typeof bucketHistogramOperationSchema.type;
export type LensApiRangeOperation = typeof bucketRangesOperationSchema.type;
export type LensApiFiltersOperation = typeof bucketFiltersOperationSchema.type;

export type LensApiBucketOperations =
  | LensApiDateHistogramOperation
  | LensApiTermsOperation
  | LensApiHistogramOperation
  | LensApiRangeOperation
  | LensApiFiltersOperation;
