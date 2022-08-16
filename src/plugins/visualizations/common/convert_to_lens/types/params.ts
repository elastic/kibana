/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column } from './columns';
import { Filter, NumberValueFormat } from './common';

export interface FiltersParams {
  filters: Filter[];
}

export interface RangeParams {
  type: 'histogram' | 'range';
  maxBars: 'auto' | number;
  ranges: Range[];
  format?: NumberValueFormat;
  includeEmptyRows?: boolean;
  parentFormat?: {
    id: string;
    params?: {
      id?: string;
      template?: string;
      replaceInfinity?: boolean;
    };
  };
}

export interface TermsParams {
  size: number;
  accuracyMode?: boolean;
  include?: string[] | number[];
  exclude?: string[] | number[];
  includeIsRegex?: boolean;
  excludeIsRegex?: boolean;
  orderBy:
    | { type: 'alphabetical'; fallback?: boolean }
    | { type: 'rare'; maxDocCount: number }
    | { type: 'column'; columnId: string }
    | { type: 'custom' };
  orderAgg?: Column;
  orderDirection: 'asc' | 'desc';
  otherBucket?: boolean;
  missingBucket?: boolean;
  secondaryFields?: string[];
  format?: NumberValueFormat;
  parentFormat?: { id: string };
}

export interface DateHistogramParams {
  interval: string;
  ignoreTimeRange?: boolean;
  includeEmptyRows?: boolean;
  dropPartials?: boolean;
}

export interface MinParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface MaxParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface AvgParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface SumParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface MedianParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface StandardDeviationParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface CardinalityParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface PercentileParams {
  percentile: number;
  format?: NumberValueFormat;
}

export interface PercentileRanksParams {
  value: number;
}

export interface CountParams {
  emptyAsNull?: boolean;
  format?: NumberValueFormat;
}

export interface LastValueParams {
  sortField: string;
  showArrayValues: boolean;
  format?: NumberValueFormat;
}

export interface CumulativeSumParams {
  format?: NumberValueFormat;
}

export interface CounterRateParams {
  format?: NumberValueFormat;
}

export interface DerivativeParams {
  format?: NumberValueFormat;
}

export interface MovingAverageParams {
  window: number;
}

export interface FormulaParams {
  formula?: string;
  isFormulaBroken?: boolean;
  format?: NumberValueFormat;
}

export interface StaticValueParams {
  value?: string;
  format?: NumberValueFormat;
}

export interface TimeScaleParams {
  unit?: string;
}
