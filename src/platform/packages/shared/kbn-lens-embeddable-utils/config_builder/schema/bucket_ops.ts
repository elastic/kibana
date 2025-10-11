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

const labelSharedProp = {
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
        description:
          'Field to be used for the date histogram - time field for grouping data by time intervals',
      },
    }),
    /**
     * Suggested interval
     */
    suggested_interval: schema.string({
      defaultValue: LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
      meta: {
        description:
          'Suggested interval - recommended time interval for the histogram (e.g., "1h", "1d", "1w")',
      },
    }),
    /**
     * Whether to use original time range
     */
    use_original_time_range: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      meta: {
        description:
          'Whether to use original time range - ignore the current time filter and use the full data range',
      },
    }),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      meta: {
        description:
          'Whether to include empty rows - show time intervals with no data as empty buckets',
      },
    }),
    drop_partial_intervals: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'Whether to drop partial intervals - exclude incomplete time intervals at the edges',
        },
      })
    ),
  },
  {
    meta: {
      description:
        'Date histogram bucket operation - groups data by time intervals for time-based analysis',
    },
  }
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
          description:
            'Fields to be used for the terms - field names to group data by unique values',
        },
      })
    ),
    /**
     * Size of the terms
     */
    size: schema.number({
      defaultValue: LENS_TERMS_SIZE_DEFAULT,
      meta: { description: 'Size of the terms - maximum number of unique terms to return' },
    }),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'Whether to increase accuracy - use more precise aggregation for better results',
        },
      })
    ),
    /**
     * Includes
     */
    includes: schema.maybe(
      schema.object(
        {
          values: schema.arrayOf(
            schema.string({
              meta: {
                description: 'Values to include - specific values to include in the results',
              },
            })
          ),
          as_regex: schema.maybe(
            schema.boolean({
              meta: {
                description: 'Whether to use regex - treat include values as regular expressions',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Include filter - specify which values to include in the terms aggregation',
          },
        }
      )
    ),
    /**
     * Excludes
     */
    excludes: schema.maybe(
      schema.object(
        {
          values: schema.arrayOf(
            schema.string({
              meta: {
                description: 'Values to exclude - specific values to exclude from the results',
              },
            })
          ),
          as_regex: schema.maybe(
            schema.boolean({
              meta: {
                description: 'Whether to use regex - treat exclude values as regular expressions',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Exclude filter - specify which values to exclude from the terms aggregation',
          },
        }
      )
    ),
    /**
     * Other bucket
     */
    other_bucket: schema.maybe(
      schema.object(
        {
          include_documents_without_field: schema.boolean({
            meta: {
              description:
                'Whether to include documents without field - include documents that lack the field in the "Other" bucket',
            },
          }),
        },
        {
          meta: {
            description:
              'Other bucket configuration - how to handle documents that do not match the main terms',
          },
        }
      )
    ),
    /**
     * Rank by
     */
    rank_by: schema.maybe(
      schema.oneOf(
        [
          schema.object(
            {
              type: schema.literal('alphabetical'),
              /**
               * Direction of the alphabetical order
               */
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            },
            {
              meta: {
                description:
                  'Alphabetical ranking - sort terms alphabetically in ascending or descending order',
              },
            }
          ),
          schema.object(
            {
              type: schema.literal('rare'),
              /**
               * Maximum number of rare terms
               */
              max: schema.number({
                meta: {
                  description:
                    'Maximum number of rare terms - limit the number of rare terms returned',
                },
              }),
            },
            {
              meta: {
                description: 'Rare terms ranking - find the least frequently occurring terms',
              },
            }
          ),
          schema.object(
            {
              type: schema.literal('significant'),
            },
            {
              meta: {
                description:
                  'Significant terms ranking - find terms that are statistically significant',
              },
            }
          ),
          schema.object(
            {
              type: schema.literal('column'),
              /**
               * Metric to be used for the column
               */
              metric: schema.number({
                meta: {
                  description: 'Metric to be used for the column - metric index for sorting',
                },
              }),
              /**
               * Direction of the column
               */
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            },
            {
              meta: {
                description: 'Column-based ranking - sort terms by a specific metric column',
              },
            }
          ),
          schema.object(
            {
              type: schema.literal('custom'),
              /**
               * Operation type
               * @TODO handle the different param options for some of these operations
               */
              operation: schema.oneOf(
                [
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
                ],
                {
                  meta: {
                    description:
                      'Custom operation type - statistical operation to use for ranking terms',
                  },
                }
              ),
              /**
               * Field to be used for the custom operation
               */
              field: schema.string({
                meta: {
                  description:
                    'Field to be used for the custom operation - field to calculate the ranking metric from',
                },
              }),
              /**
               * Direction of the custom operation
               */
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            },
            {
              meta: {
                description:
                  'Custom ranking - sort terms by a custom statistical operation on a specific field',
              },
            }
          ),
        ],
        {
          meta: {
            description:
              'Ranking configuration - defines how to sort and rank the terms (alphabetical, rare, significant, column-based, or custom)',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Terms bucket operation - groups data by unique values of specified fields with configurable filtering and ranking',
    },
  }
);

export const bucketFiltersOperationSchema = schema.object(
  {
    operation: schema.literal('filters'),
    ...labelSharedProp,
    /**
     * Filters
     */
    filters: schema.arrayOf(filterWithLabelSchema),
  },
  {
    meta: {
      description: 'Filters bucket operation - groups data by predefined filter conditions',
    },
  }
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
          description: 'Label for the operation - custom display name for the histogram bucket',
        },
      })
    ),
    /**
     * Field to be used for the histogram
     */
    field: schema.string({
      meta: {
        description:
          'Field to be used for the histogram - numeric field to create histogram buckets from',
      },
    }),
    /**
     * Granularity of the histogram
     */
    granularity: schema.oneOf(
      [
        schema.number({
          meta: {
            description: 'Granularity of the histogram - interval size for histogram buckets',
          },
          min: LENS_HISTOGRAM_GRANULARITY_MIN,
          max: LENS_HISTOGRAM_GRANULARITY_MAX,
        }),
        schema.literal('auto'),
      ],
      {
        defaultValue: LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
        meta: {
          description:
            'Histogram granularity - interval size for grouping numeric values (number or "auto" for automatic sizing)',
        },
      }
    ),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.boolean({
      meta: {
        description:
          'Whether to include empty rows - show histogram buckets with no data as empty buckets',
      },
      defaultValue: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
    }),
  },
  {
    meta: {
      description:
        'Histogram bucket operation - groups numeric data into equal-width intervals for distribution analysis',
    },
  }
);

export const bucketRangesOperationSchema = schema.object(
  {
    operation: schema.literal('range'),
    ...formatSchema,
    ...labelSharedProp,
    /**
     * Label for the operation
     */
    label: schema.maybe(
      schema.string({
        meta: {
          description: 'Label for the operation - custom display name for the range bucket',
        },
      })
    ),
    /**
     * Field to be used for the range
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the range - numeric field to create range buckets from',
      },
    }),
    /**
     * Ranges
     */
    ranges: schema.arrayOf(
      schema.object(
        {
          /**
           * Less than or equal to
           */
          lte: schema.maybe(
            schema.number({
              meta: {
                description: 'Less than or equal to - upper bound for the range (inclusive)',
              },
            })
          ),
          /**
           * Greater than
           */
          gt: schema.maybe(
            schema.number({
              meta: {
                description: 'Greater than - lower bound for the range (exclusive)',
              },
            })
          ),
          /**
           * Label
           */
          label: schema.maybe(
            schema.string({
              meta: {
                description: 'Label - custom display name for this range bucket',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Range definition - defines a numeric range with optional upper/lower bounds and label',
          },
        }
      )
    ),
  },
  {
    meta: {
      description:
        'Range bucket operation - groups numeric data into custom ranges for value distribution analysis',
    },
  }
);

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
