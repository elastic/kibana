/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CARDINALITY_ID,
  COUNTER_RATE_ID,
  COUNT_ID,
  CUMULATIVE_SUM_ID,
  DIFFERENCES_ID,
  LAST_VALUE_ID,
  MOVING_AVERAGE_ID,
  NORMALIZE_BY_UNIT_ID,
  OVERALL_AVERAGE_ID,
  OVERALL_MAX_ID,
  OVERALL_MIN_ID,
  OVERALL_SUM_ID,
  PERCENTILE_ID,
  PERCENTILE_RANK_ID,
} from '@kbn/lens-formula-docs';
import type { Range } from '@kbn/expressions-plugin/public';
import type { TinymathAST, TinymathFunction } from '@kbn/tinymath';
import type { QueryFilter } from '@kbn/data-plugin/common';
import type { DateRange, ValueFormatConfig } from '../types';
import type {
  BaseIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from './types';
import type { AUTO_BARS, LENS_RANGE_MODES } from './constants';

// Basic operations
export type CountIndexPatternColumn = FieldBasedIndexPatternColumn & {
  operationType: typeof COUNT_ID;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
};

export interface CardinalityIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof CARDINALITY_ID;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
}

export interface LastValueIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof LAST_VALUE_ID;
  params: {
    sortField: string;
    showArrayValues: boolean;
    // last value on numeric fields can be formatted
    format?: ValueFormatConfig;
  };
}

export type MetricColumn<T> = FieldBasedIndexPatternColumn & {
  operationType: T;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
};

export type SumIndexPatternColumn = MetricColumn<'sum'>;
export type AvgIndexPatternColumn = MetricColumn<'average'>;
export type StandardDeviationIndexPatternColumn = MetricColumn<'standard_deviation'>;
export type MinIndexPatternColumn = MetricColumn<'min'>;
export type MaxIndexPatternColumn = MetricColumn<'max'>;
export type MedianIndexPatternColumn = MetricColumn<'median'>;

export interface PercentileIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof PERCENTILE_ID;
  params: {
    percentile: number;
    format?: ValueFormatConfig;
  };
}

export interface PercentileRanksIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof PERCENTILE_RANK_ID;
  params: {
    value: number;
    format?: ValueFormatConfig;
  };
}

// Reference based operations
export type CounterRateIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof COUNTER_RATE_ID;
  };

export type CumulativeSumIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof CUMULATIVE_SUM_ID;
  };

export type DerivativeIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof DIFFERENCES_ID;
  };

export type MovingAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof MOVING_AVERAGE_ID;
    params: {
      window: number;
    };
  };

export type TimeScaleIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof NORMALIZE_BY_UNIT_ID;
    params: {
      unit?: string;
    };
  };

// Full managed operations
export interface StaticValueIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'static_value';
  params: {
    value?: string;
    format?: ValueFormatConfig;
  };
}

export interface MathIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'math';
  params: {
    tinymathAst: TinymathAST | TinymathFunction | string;
    // last value on numeric fields can be formatted
    format?: ValueFormatConfig;
  };
}

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    formula?: string;
    isFormulaBroken?: boolean;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export type OverallMetricIndexPatternColumn<T extends string> = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: T;
  };

export type OverallSumIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_SUM_ID>;
export type OverallMinIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_MIN_ID>;
export type OverallMaxIndexPatternColumn = OverallMetricIndexPatternColumn<typeof OVERALL_MAX_ID>;
export type OverallAverageIndexPatternColumn = OverallMetricIndexPatternColumn<
  typeof OVERALL_AVERAGE_ID
>;

export interface LensConstantContextValues {
  dateRange?: DateRange;
  now?: Date;
  targetBars?: number;
}

export interface TimeRangeIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'time_range';
}

export interface NowIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'now';
}

export interface IntervalIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'interval';
}

export type ConstantsIndexPatternColumn =
  | IntervalIndexPatternColumn
  | TimeRangeIndexPatternColumn
  | NowIndexPatternColumn;

// Bucketed operations
export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    // accuracy mode is accomplished by increasing shard_size
    accuracyMode?: boolean;
    include?: string[] | number[];
    exclude?: string[] | number[];
    includeIsRegex?: boolean;
    excludeIsRegex?: boolean;
    // if order is alphabetical, the `fallback` flag indicates whether it became alphabetical because there wasn't
    // another option or whether the user explicitly chose to make it alphabetical.
    orderBy:
      | { type: 'alphabetical'; fallback?: boolean }
      | { type: 'rare'; maxDocCount: number }
      | { type: 'significant' }
      | { type: 'column'; columnId: string }
      | { type: 'custom' };
    orderAgg?: FieldBasedIndexPatternColumn;
    orderDirection: 'asc' | 'desc';
    otherBucket?: boolean;
    missingBucket?: boolean;
    secondaryFields?: string[];
    // Terms on numeric fields can be formatted
    format?: ValueFormatConfig;
    parentFormat?: {
      id: string;
    };
  };
}

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    ignoreTimeRange?: boolean;
    includeEmptyRows?: boolean;
    dropPartials?: boolean;
  };
}

export type RangeType = Omit<Range, 'type'>;
// Try to cover all possible serialized states for ranges
export type RangeTypeLens = (RangeType | { from: Range['from'] | null; to: Range['to'] | null }) & {
  label: string;
};
export type FullRangeTypeLens = Extract<RangeTypeLens, NonNullable<RangeType>>;

export type LENS_RANGE_MODES_TYPES = (typeof LENS_RANGE_MODES)[keyof typeof LENS_RANGE_MODES];

export interface RangeIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'range';
  params: {
    type: LENS_RANGE_MODES_TYPES;
    maxBars: typeof AUTO_BARS | number;
    ranges: RangeTypeLens[];
    format?: { id: string; params?: { decimals: number; compact?: boolean } };
    includeEmptyRows?: boolean;
    parentFormat?: {
      id: string;
      params?: { id?: string; template?: string; replaceInfinity?: boolean };
    };
  };
}

export type LensAggFilter = QueryFilter & { label: string };

export interface LensAggFilterValue extends LensAggFilter {
  id: string;
}

export interface FiltersIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: 'filters';
  params: {
    filters: LensAggFilter[];
  };
}
