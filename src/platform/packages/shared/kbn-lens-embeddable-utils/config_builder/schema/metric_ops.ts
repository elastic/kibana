/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { filterSchema } from './filter';
import { formatSchema } from './format';
import {
  LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
  LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  LENS_STATIC_VALUE_DEFAULT,
} from './constants';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../transforms/columns/utils';

export const genericOperationOptionsSchema = {
  ...formatSchema,
  /**
   * Label for the operation
   */
  label: schema.maybe(
    schema.string({
      meta: {
        description: 'Label for the operation - custom display name for the metric operation',
      },
    })
  ),
};

export const staticOperationDefinitionSchema = schema.object(
  {
    ...genericOperationOptionsSchema,
    operation: schema.literal('static_value'),
    /**
     * Static value
     */
    value: schema.number({
      meta: {
        description: 'Static value - a fixed numeric value to display as the metric',
      },
      defaultValue: LENS_STATIC_VALUE_DEFAULT,
    }),
  },
  {
    meta: {
      description: 'Static value operation - displays a fixed numeric value as the metric',
    },
  }
);

export const formulaOperationDefinitionSchema = schema.object(
  {
    ...genericOperationOptionsSchema,
    operation: schema.literal('formula'),
    /**
     * Formula
     */
    formula: schema.string({
      meta: {
        description: 'Formula - mathematical expression to calculate the metric value',
      },
    }),
  },
  {
    meta: {
      description: 'Formula operation - calculates metric value using a mathematical expression',
    },
  }
);

export const esqlColumnSchema = schema.object(
  {
    /**
     * Value
     */
    operation: schema.literal('value'),
    column: schema.string({
      meta: {
        description: 'Column to use - ESQL column name from the query result',
      },
    }),
  },
  {
    meta: {
      description: 'ESQL column operation - references a column from the ESQL query result',
    },
  }
);

export const metricOperationSharedSchema = {
  ...genericOperationOptionsSchema,
  /**
   * Time scale
   */
  time_scale: schema.maybe(
    schema.oneOf(
      [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
      {
        meta: {
          description:
            'Time scale - unit for time-based calculations (s=seconds, m=minutes, h=hours, d=days)',
        },
      }
    )
  ),
  /**
   * Reduced time range
   */
  reduced_time_range: schema.maybe(
    schema.string({
      meta: { description: 'Reduced time range - specific time period for the calculation' },
    })
  ),
  /**
   * Time shift
   */
  time_shift: schema.maybe(
    schema.string({
      meta: { description: 'Time shift - offset the time range for comparison calculations' },
    })
  ),
  /**
   * Filter
   */
  filter: schema.maybe(filterSchema),
};

export const fieldBasedOperationSharedSchema = {
  ...metricOperationSharedSchema,
  /**
   * Field to be used for the metric
   */
  field: schema.string({
    meta: {
      description:
        'Field to be used for the metric - Elasticsearch field name to calculate the metric from',
    },
  }),
};

const emptyAsNullSchemaRawObject = {
  /**
   * Whether to consider null values as null
   */
  empty_as_null: schema.boolean({
    meta: {
      description:
        'Whether to consider null values as null - treat empty/missing values as null instead of zero',
    },
    defaultValue: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  }),
};

export const countMetricOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    ...emptyAsNullSchemaRawObject,
    /**
     * Select the operation type
     */
    operation: schema.literal('count'),
    /**
     * Field to be used for the metric
     */
    field: schema.maybe(schema.string()),
  },
  {
    meta: {
      description: 'Count operation - counts the number of documents or unique values in a field',
    },
  }
);

export const uniqueCountMetricOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    ...emptyAsNullSchemaRawObject,
    operation: schema.literal('unique_count'),
  },
  {
    meta: {
      description: 'Unique count operation - counts the number of unique values in a field',
    },
  }
);

export const metricOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.oneOf(
      [
        schema.literal('min'),
        schema.literal('max'),
        schema.literal('average'),
        schema.literal('median'),
        schema.literal('standard_deviation'),
      ],
      {
        meta: {
          description:
            'Statistical operation type - min, max, average, median, or standard_deviation',
        },
      }
    ),
  },
  {
    meta: {
      description:
        'Statistical metric operation - calculates statistical values (min, max, average, median, standard deviation) from a numeric field',
    },
  }
);

export const sumMetricOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    ...emptyAsNullSchemaRawObject,
    operation: schema.literal('sum'),
  },
  {
    meta: {
      description: 'Sum operation - calculates the total sum of values in a numeric field',
    },
  }
);

export const lastValueOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.literal('last_value'),
    sort_by: schema.string({
      meta: {
        description: 'Field to sort by - determines the order for selecting the last value',
      },
    }),
    show_array_values: schema.boolean({
      meta: {
        description: 'Handle array values - whether to show array values or just the first element',
      },
      defaultValue: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
    }),
  },
  {
    meta: {
      description:
        'Last value operation - retrieves the most recent value from a field based on sorting criteria',
    },
  }
);

export const percentileOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.literal('percentile'),
    percentile: schema.number({
      meta: { description: 'Percentile - the percentile value to calculate (0-100)' },
      defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      description:
        'Percentile operation - calculates a specific percentile value from a numeric field',
    },
  }
);

export const percentileRanksOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.literal('percentile_rank'),
    rank: schema.number({
      meta: { description: 'Percentile Rank - the value to find the percentile rank for' },
      defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    }),
  },
  {
    meta: {
      description:
        'Percentile rank operation - calculates the percentile rank of a specific value in a numeric field',
    },
  }
);

export const fieldMetricOperationsSchema = schema.oneOf([
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  sumMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export const differencesOperationSchema = schema.object(
  {
    ...metricOperationSharedSchema,
    operation: schema.literal('differences'),
    of: fieldMetricOperationsSchema,
  },
  {
    meta: {
      description:
        'Differences operation - calculates the difference between consecutive values in a time series',
    },
  }
);

export const movingAverageOperationSchema = schema.object(
  {
    ...metricOperationSharedSchema,
    operation: schema.literal('moving_average'),
    of: fieldMetricOperationsSchema,
    window: schema.number({
      meta: {
        description: 'Window - number of periods to include in the moving average calculation',
      },
      defaultValue: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
    }),
  },
  {
    meta: {
      description:
        'Moving average operation - calculates the average of values over a sliding window of periods',
    },
  }
);

export const cumulativeSumOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.literal('cumulative_sum'),
  },
  {
    meta: {
      description: 'Cumulative sum operation - calculates the running total of values over time',
    },
  }
);

export const counterRateOperationSchema = schema.object(
  {
    ...fieldBasedOperationSharedSchema,
    operation: schema.literal('counter_rate'),
  },
  {
    meta: {
      description:
        'Counter rate operation - calculates the rate of change for counter metrics over time',
    },
  }
);

export const metricOperationDefinitionSchema = schema.oneOf([
  formulaOperationDefinitionSchema,
  staticOperationDefinitionSchema,
  fieldMetricOperationsSchema,
  differencesOperationSchema,
  movingAverageOperationSchema,
  cumulativeSumOperationSchema,
  counterRateOperationSchema,
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export type LensApiAllMetricOperations = typeof metricOperationDefinitionSchema.type;
export type LensApiReferableMetricOperations =
  | LensApiCountMetricOperation
  | LensApiUniqueCountMetricOperation
  | LensApiMetricOperation
  | LensApiSumMetricOperation
  | LensApiLastValueOperation
  | LensApiPercentileOperation
  | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = typeof fieldMetricOperationsSchema.type;

export type LensApiCountMetricOperation = typeof countMetricOperationSchema.type;
export type LensApiUniqueCountMetricOperation = typeof uniqueCountMetricOperationSchema.type;
export type LensApiMetricOperation = typeof metricOperationSchema.type;
export type LensApiSumMetricOperation = typeof sumMetricOperationSchema.type;
export type LensApiLastValueOperation = typeof lastValueOperationSchema.type;
export type LensApiPercentileOperation = typeof percentileOperationSchema.type;
export type LensApiPercentileRanksOperation = typeof percentileRanksOperationSchema.type;
export type LensApiDifferencesOperation = typeof differencesOperationSchema.type;
export type LensApiMovingAverageOperation = typeof movingAverageOperationSchema.type;
export type LensApiCumulativeSumOperation = typeof cumulativeSumOperationSchema.type;
export type LensApiCounterRateOperation = typeof counterRateOperationSchema.type;
export type LensApiFormulaOperation = typeof formulaOperationDefinitionSchema.type;
export type LensApiStaticValueOperation = typeof staticOperationDefinitionSchema.type;
