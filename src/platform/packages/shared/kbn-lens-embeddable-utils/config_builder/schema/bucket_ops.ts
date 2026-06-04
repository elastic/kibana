/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
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
import { labelSharedSchema } from './shared';
import { directionSchema } from './enums';

export const BUCKET_OP_TITLES = {
  dateHistogram: 'Date Histogram Operation',
  terms: 'Terms Operation',
  filters: 'Filters Operation',
  histogram: 'Histogram Operation',
  ranges: 'Ranges Operation',
} as const;

export const bucketDateHistogramOperationSchema = z
  .object({
    /**
     * Select bucket operation type
     */
    operation: z.literal('date_histogram'),
    ...labelSharedSchema.shape,
    /**
     * Field to be used for the date histogram
     */
    field: z.string().meta({
      description: 'Field to be used for the date histogram.',
    }),
    /**
     * Suggested interval
     */
    suggested_interval: z.string().default(LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT).meta({
      description: 'Suggested time interval.',
    }),
    /**
     * Whether to use original time range
     */
    use_original_time_range: z
      .boolean()
      .default(LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT)
      .meta({
        description:
          'When `true`, uses the original time range instead of the current query time range.',
      }),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: z.boolean().default(LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT).meta({
      description: 'When `true`, includes empty rows in the results.',
    }),
    drop_partial_intervals: z.boolean().default(false).optional().meta({
      description: 'When `true`, drops partial intervals from the results.',
    }),
  })
  .strict()
  .meta({ id: 'dateHistogramOperation', title: BUCKET_OP_TITLES.dateHistogram });
const bucketTermsRankByCustomSharedSchema = z
  .object({
    type: z.literal('custom'),
    /**
     * Field to be used for the custom operation
     */
    field: z.string().meta({
      description: 'Numeric field to be used for the custom operation.',
    }),
    /**
     * Direction of the custom operation
     */
    direction: directionSchema.meta({
      id: 'termsRankByCustomDirection',
      description: 'Sort direction for custom ranking.',
    }),
  })
  .strict();

const bucketTermsRankByCustomOperationSchema = bucketTermsRankByCustomSharedSchema
  .extend({
    operation: z.union([
      z.literal('min'),
      z.literal('max'),
      z.literal('average'),
      z.literal('median'),
      z.literal('standard_deviation'),
      z.literal('unique_count'),
      z.literal('sum'),
      z.literal('last_value'),
    ]),
  })
  .meta({
    id: 'termsRankByCustomOperation',
    title: 'Terms Rank By Custom Operation',
    description: 'Terms ranked by custom operation.',
  });

const bucketTermsRankByCustomCountOperationSchema = bucketTermsRankByCustomSharedSchema
  .extend({
    operation: z.literal('count'),
    field: z.string().optional().meta({
      description: 'Numeric field to be used for the custom operation.',
    }),
  })
  .meta({
    id: 'termsRankByCustomCountOperation',
    title: 'Terms Rank By Custom Count Operation',
    description: 'Terms ranked by count, either of all documents or of a specific field.',
  });

const bucketTermsRankByPercentileOperationSchema = bucketTermsRankByCustomSharedSchema
  .extend({
    operation: z.literal('percentile'),
    percentile: z.number().default(LENS_PERCENTILE_DEFAULT_VALUE).meta({
      description:
        'The percentile threshold (0–100) at which to compute the field value used for ranking terms.',
    }),
  })
  .meta({
    id: 'termsRankByPercentileOperation',
    title: 'Terms Rank By Percentile Operation',
    description:
      'Terms ranked by a percentile of a numeric field, for example the 95th percentile of response time.',
  });
const bucketTermsRankByPercentileRankOperationSchema = bucketTermsRankByCustomSharedSchema
  .extend({
    operation: z.literal('percentile_rank'),
    rank: z.number().default(LENS_PERCENTILE_RANK_DEFAULT_VALUE).meta({
      description:
        'The numeric value for which to compute the percentile rank (the percentage of field values at or below this value).',
    }),
  })
  .meta({
    id: 'termsRankByPercentileRankOperation',
    title: 'Terms Rank By Percentile Rank Operation',
    description:
      'Terms ranked by the percentile rank of a single value: the proportion of field values at or below that value.',
  });

export const bucketTermsOperationSchema = z
  .object({
    operation: z.literal('terms'),
    ...formatSchema.shape,
    ...labelSharedSchema.shape,
    /**
     * Fields to be used for the terms
     */
    fields: z
      .array(
        z.string().meta({
          description: 'Fields to be used for the terms.',
        })
      )
      .min(1)
      .max(4),
    /**
     * Maximum number of terms.
     */
    limit: z
      .number()
      .default(LENS_TERMS_LIMIT_DEFAULT)
      .meta({ description: 'Number of terms to return.' }),
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: z.boolean().optional().meta({
      description: 'When `true`, increases accuracy at the cost of performance.',
    }),
    /**
     * Includes
     */
    includes: z
      .object({
        values: z
          .array(
            z.string().meta({
              description: 'Values to include.',
            })
          )
          .max(100),
        as_regex: z.boolean().optional().meta({
          description: 'When `true`, treats the values as regular expressions.',
        }),
      })
      .strict()
      .optional(),
    /**
     * Excludes
     */
    excludes: z
      .object({
        values: z
          .array(
            z.string().meta({
              description: 'Values to exclude.',
            })
          )
          .max(100),
        as_regex: z.boolean().optional().meta({
          description: 'When `true`, treats the values as regular expressions.',
        }),
      })
      .strict()
      .optional(),
    /**
     * Other bucket
     */
    other_bucket: z
      .object({
        include_documents_without_field: z.boolean().meta({
          description: 'When `true`, includes documents that do not have the specified field.',
        }),
      })
      .strict()
      .optional(),
    /**
     * Rank by
     */
    rank_by: z
      .union([
        z
          .object({
            type: z.literal('alphabetical'),
            /**
             * Direction of the alphabetical order
             */
            direction: directionSchema.meta({
              id: 'termsRankByAlphabeticalDirection',
              description: 'Sort direction for alphabetical ranking.',
            }),
          })
          .strict()
          .meta({
            id: 'termsRankByAlphabetical',
            title: 'Terms Rank By Alphabetical',
            description: 'Terms ranked alphabetically.',
          }),
        z
          .object({
            type: z.literal('rare'),
            /**
             * Maximum number of rare terms
             */
            max: z.number().meta({
              description: 'Maximum number of rare terms to include.',
            }),
          })
          .strict()
          .meta({
            id: 'termsRankByRare',
            title: 'Terms Rank By Rarity',
            description: 'Terms ranked by rarity.',
          }),
        z
          .object({
            type: z.literal('significant'),
          })
          .strict()
          .meta({
            id: 'termsRankBySignificant',
            title: 'Terms Rank By Significance',
            description: 'Terms ranked by significance.',
          }),
        z
          .object({
            type: z.literal('metric'),
            metric_index: z.number().min(0).default(0).meta({
              description:
                'Zero-based index into the metrics array identifying which metric to rank by.',
            }),

            direction: directionSchema.meta({
              id: 'termsRankByMetricDirection',
              description: 'Sort direction for metric-based ranking.',
            }),
          })
          .strict()
          .meta({
            id: 'termsRankByMetric',
            title: 'Terms Rank By Metric',
            description: 'Terms ranked by a linked metric.',
          }),
        bucketTermsRankByCustomOperationSchema,
        bucketTermsRankByCustomCountOperationSchema,
        bucketTermsRankByPercentileOperationSchema,
        bucketTermsRankByPercentileRankOperationSchema,
      ])
      .optional(),
  })
  .strict()
  .meta({ id: 'termsOperation', title: BUCKET_OP_TITLES.terms });

export const bucketFiltersOperationSchema = z
  .object({
    operation: z.literal('filters'),
    ...labelSharedSchema.shape,
    /**
     * Filters
     */
    filters: z.array(filterWithLabelSchema).max(100),
  })
  .strict()
  .meta({ id: 'filtersOperation', title: BUCKET_OP_TITLES.filters });

export const bucketHistogramOperationSchema = z
  .object({
    operation: z.literal('histogram'),
    ...formatSchema.shape,
    ...labelSharedSchema.shape,
    /**
     * Label for the operation
     */
    label: z.string().optional().meta({
      description: 'Label for the operation',
    }),
    /**
     * Field to be used for the histogram
     */
    field: z.string().meta({
      description: 'Field to be used for the histogram.',
    }),
    /**
     * Granularity of the histogram
     */
    granularity: z
      .union([
        z.number().min(LENS_HISTOGRAM_GRANULARITY_MIN).max(LENS_HISTOGRAM_GRANULARITY_MAX).meta({
          description: 'Granularity of the histogram.',
        }),
        z.literal('auto'),
      ])
      .default(LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE),
    /**
     * Whether to include empty rows
     */
    include_empty_rows: z.boolean().default(LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT).meta({
      description: 'When `true`, includes empty rows in the results.',
    }),
  })
  .strict()
  .meta({ id: 'histogramOperation', title: BUCKET_OP_TITLES.histogram });

export const bucketRangesOperationSchema = z
  .object({
    operation: z.literal('range'),
    ...formatSchema.shape,
    ...labelSharedSchema.shape,
    /**
     * Label for the operation
     */
    label: z.string().optional().meta({
      description: 'Label for the operation',
    }),
    /**
     * Field to be used for the range
     */
    field: z.string().meta({
      description: 'Field to be used for the range.',
    }),
    /**
     * Ranges
     */
    ranges: z
      .array(
        z
          .object({
            /**
             * Less than or equal to
             */
            lte: z.number().optional().meta({
              description: 'Less than or equal to.',
            }),
            /**
             * Greater than
             */
            gt: z.number().optional().meta({
              description: 'Greater than.',
            }),
            /**
             * Label
             */
            label: z.string().optional().meta({
              description: 'Label.',
            }),
          })
          .strict()
      )
      .max(100),
  })
  .strict()
  .meta({ id: 'rangesOperation', title: BUCKET_OP_TITLES.ranges });

export const bucketOperationDefinitionSchema = z
  .union([
    bucketDateHistogramOperationSchema,
    bucketTermsOperationSchema,
    bucketHistogramOperationSchema,
    bucketRangesOperationSchema,
    bucketFiltersOperationSchema,
  ])
  .meta({
    title: 'Breakdown Operation',
    description:
      'Breakdown dimension configuration using date histogram, terms, numeric histogram, value ranges, or custom filters.',
  });

export type TermOperationRankByCustomOperationType = z.output<
  typeof bucketTermsRankByCustomOperationSchema
>;
export type TermOperationRankByCustomCountOperationType = z.output<
  typeof bucketTermsRankByCustomCountOperationSchema
>;
export type TermOperationRankByCustomPercentileType = z.output<
  typeof bucketTermsRankByPercentileOperationSchema
>;
export type TermOperationRankByCustomPercentileRankType = z.output<
  typeof bucketTermsRankByPercentileRankOperationSchema
>;

export type LensApiDateHistogramOperation = z.output<typeof bucketDateHistogramOperationSchema>;
export type LensApiTermsOperation = z.output<typeof bucketTermsOperationSchema>;
export type LensApiHistogramOperation = z.output<typeof bucketHistogramOperationSchema>;
export type LensApiRangeOperation = z.output<typeof bucketRangesOperationSchema>;
export type LensApiFiltersOperation = z.output<typeof bucketFiltersOperationSchema>;

export type LensApiBucketOperations =
  | LensApiDateHistogramOperation
  | LensApiTermsOperation
  | LensApiHistogramOperation
  | LensApiRangeOperation
  | LensApiFiltersOperation;
