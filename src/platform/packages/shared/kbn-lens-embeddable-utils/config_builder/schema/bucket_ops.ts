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
import { filterWithLabelSchema } from './filter';
import {
  LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE,
  LENS_HISTOGRAM_GRANULARITY_MAX,
  LENS_HISTOGRAM_GRANULARITY_MIN,
  LENS_TERMS_LIMIT_DEFAULT,
  LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
  LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
} from './constants';
import { formatSchema } from './format';
import { labelSharedProp } from './shared';
import { builderEnums } from './enums';

export const BUCKET_OP_TITLES = {
  dateHistogram: 'Date Histogram Operation',
  terms: 'Terms Operation',
  filters: 'Filters Operation',
  histogram: 'Histogram Operation',
  ranges: 'Ranges Operation',
} as const;

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
        description: 'Field to be used for the date histogram.',
      },
    }),
    /**
     * Suggested interval
     */
    suggested_interval: schema.string({
      defaultValue: LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
      meta: {
        description: 'Suggested time interval.',
      },
    }),
    /**
     * Whether to use original time range
     */
    use_original_time_range: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
      meta: {
        description:
          'When `true`, uses the original time range instead of the current query time range.',
      },
    }),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: schema.boolean({
      defaultValue: LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      meta: {
        description: 'When `true`, includes empty rows in the results.',
      },
    }),
    drop_partial_intervals: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'When `true`, drops partial intervals from the results.',
        },
      })
    ),
  },
  { meta: { id: 'dateHistogramOperation', title: BUCKET_OP_TITLES.dateHistogram } }
);
const bucketTermsRankByCustomSharedSchema = schema.object({
  type: schema.literal('custom'),
  /**
   * Field to be used for the custom operation
   */
  field: schema.string({
    meta: {
      description: 'Numeric field to be used for the custom operation.',
    },
  }),
  /**
   * Direction of the custom operation
   */
  direction: builderEnums.direction({
    meta: {
      id: 'termsRankByCustomDirection',
      description: 'Sort direction for custom ranking.',
    },
  }),
});

const bucketTermsRankByCustomOperationSchema = bucketTermsRankByCustomSharedSchema.extends(
  {
    operation: schema.oneOf([
      schema.literal('min'),
      schema.literal('max'),
      schema.literal('average'),
      schema.literal('median'),
      schema.literal('standard_deviation'),
      schema.literal('unique_count'),
      schema.literal('count'),
      schema.literal('sum'),
      schema.literal('last_value'),
    ]),
  },
  {
    meta: {
      id: 'termsRankByCustomOperation',
      title: 'Terms Rank By Custom Operation',
      description: 'Terms ranked by custom operation.',
    },
  }
);

const bucketTermsRankByPercentileOperationSchema = bucketTermsRankByCustomSharedSchema.extends(
  {
    operation: schema.literal('percentile'),
    percentile: schema.number({
      meta: {
        description:
          'The percentile threshold (0–100) at which to compute the field value used for ranking terms.',
      },
      defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      id: 'termsRankByPercentileOperation',
      title: 'Terms Rank By Percentile Operation',
      description:
        'Terms ranked by a percentile of a numeric field, for example the 95th percentile of response time.',
    },
  }
);
const bucketTermsRankByPercentileRankOperationSchema = bucketTermsRankByCustomSharedSchema.extends(
  {
    operation: schema.literal('percentile_rank'),
    rank: schema.number({
      meta: {
        description:
          'The numeric value for which to compute the percentile rank (the percentage of field values at or below this value).',
      },
      defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      id: 'termsRankByPercentileRankOperation',
      title: 'Terms Rank By Percentile Rank Operation',
      description:
        'Terms ranked by the percentile rank of a single value: the proportion of field values at or below that value.',
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
          description: 'Fields to be used for the terms.',
        },
      }),
      { minSize: 1, maxSize: 4 }
    ),
    /**
     * Maximum number of terms.
     */
    limit: schema.number({
      defaultValue: LENS_TERMS_LIMIT_DEFAULT,
      meta: { description: 'Number of terms to return.' },
    }),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: schema.maybe(
      schema.boolean({
        meta: {
          description: 'When `true`, increases accuracy at the cost of performance.',
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
              description: 'Values to include.',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'When `true`, treats the values as regular expressions.',
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
              description: 'Values to exclude.',
            },
          }),
          { maxSize: 100 }
        ),
        as_regex: schema.maybe(
          schema.boolean({
            meta: {
              description: 'When `true`, treats the values as regular expressions.',
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
            description: 'When `true`, includes documents that do not have the specified field.',
          },
        }),
      })
    ),
    /**
     * Rank by
     */
    rank_by: schema.maybe(
      schema.oneOf([
        schema.object(
          {
            type: schema.literal('alphabetical'),
            /**
             * Direction of the alphabetical order
             */
            direction: builderEnums.direction({
              meta: {
                id: 'termsRankByAlphabeticalDirection',
                description: 'Sort direction for alphabetical ranking.',
              },
            }),
          },
          {
            meta: {
              id: 'termsRankByAlphabetical',
              title: 'Terms Rank By Alphabetical',
              description: 'Terms ranked alphabetically.',
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
                description: 'Maximum number of rare terms to include.',
              },
            }),
          },
          {
            meta: {
              id: 'termsRankByRare',
              title: 'Terms Rank By Rarity',
              description: 'Terms ranked by rarity.',
            },
          }
        ),
        schema.object(
          {
            type: schema.literal('significant'),
          },
          {
            meta: {
              id: 'termsRankBySignificant',
              title: 'Terms Rank By Significance',
              description: 'Terms ranked by significance.',
            },
          }
        ),
        schema.object(
          {
            type: schema.literal('metric'),
            metric_index: schema.number({
              defaultValue: 0,
              min: 0,
              meta: {
                description:
                  'Zero-based index into the metrics array identifying which metric to rank by.',
              },
            }),

            direction: builderEnums.direction({
              meta: {
                id: 'termsRankByMetricDirection',
                description: 'Sort direction for metric-based ranking.',
              },
            }),
          },
          {
            meta: {
              id: 'termsRankByMetric',
              title: 'Terms Rank By Metric',
              description: 'Terms ranked by a linked metric.',
            },
          }
        ),
        bucketTermsRankByCustomOperationSchema,
        bucketTermsRankByPercentileOperationSchema,
        bucketTermsRankByPercentileRankOperationSchema,
      ])
    ),
  },
  { meta: { id: 'termsOperation', title: BUCKET_OP_TITLES.terms } }
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
  { meta: { id: 'filtersOperation', title: BUCKET_OP_TITLES.filters } }
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
        description: 'Field to be used for the histogram.',
      },
    }),
    /**
     * Granularity of the histogram
     */
    granularity: schema.oneOf(
      [
        schema.number({
          meta: {
            description: 'Granularity of the histogram.',
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
        description: 'When `true`, includes empty rows in the results.',
      },
      defaultValue: LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT,
    }),
  },
  { meta: { id: 'histogramOperation', title: BUCKET_OP_TITLES.histogram } }
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
          description: 'Label for the operation',
        },
      })
    ),
    /**
     * Field to be used for the range
     */
    field: schema.string({
      meta: {
        description: 'Field to be used for the range.',
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
              description: 'Less than or equal to.',
            },
          })
        ),
        /**
         * Greater than
         */
        gt: schema.maybe(
          schema.number({
            meta: {
              description: 'Greater than.',
            },
          })
        ),
        /**
         * Label
         */
        label: schema.maybe(
          schema.string({
            meta: {
              description: 'Label.',
            },
          })
        ),
      }),
      { maxSize: 100 }
    ),
  },
  { meta: { id: 'rangesOperation', title: BUCKET_OP_TITLES.ranges } }
);

export const bucketOperationDefinitionSchema = schema.oneOf(
  [
    bucketDateHistogramOperationSchema,
    bucketTermsOperationSchema,
    bucketHistogramOperationSchema,
    bucketRangesOperationSchema,
    bucketFiltersOperationSchema,
  ],
  {
    meta: {
      title: 'Breakdown Operation',
      description:
        'Breakdown dimension configuration using date histogram, terms, numeric histogram, value ranges, or custom filters.',
    },
  }
);

export type TermOperationRankByCustomOperationType = TypeOf<
  typeof bucketTermsRankByCustomOperationSchema
>;
export type TermOperationRankByCustomPercentileType = TypeOf<
  typeof bucketTermsRankByPercentileOperationSchema
>;
export type TermOperationRankByCustomPercentileRankType = TypeOf<
  typeof bucketTermsRankByPercentileRankOperationSchema
>;

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
