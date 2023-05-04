/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { RANGE_MODES } from '../constants';
import { Column } from './columns';
import { Filter, NumberValueFormat } from './common';

export type RangeMode = $Values<typeof RANGE_MODES>;

export interface FormatParams {
  format?: NumberValueFormat;
}

export interface FiltersParams {
  filters: Filter[];
}

export interface TermsParams extends FormatParams {
  size: number;
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
  parentFormat?: { id: string };
}

export interface DateHistogramParams {
  interval: string;
  ignoreTimeRange?: boolean;
  includeEmptyRows?: boolean;
  dropPartials?: boolean;
}

interface Range {
  from: number | null;
  to: number | null;
  label?: string;
}
export interface RangeParams extends FormatParams {
  type: RangeMode;
  maxBars: 'auto' | number;
  ranges?: Range[];
  includeEmptyRows?: boolean;
  parentFormat?: {
    id: string;
    params?: { id?: string; template?: string; replaceInfinity?: boolean };
  };
}

export type MinParams = FormatParams;
export type MaxParams = FormatParams;
export type AvgParams = FormatParams;
export type SumParams = FormatParams;
export type MedianParams = FormatParams;
export type StandardDeviationParams = FormatParams;
export type CardinalityParams = FormatParams;
export type CumulativeSumParams = FormatParams;
export type CounterRateParams = FormatParams;
export type DerivativeParams = FormatParams;
export type CountParams = FormatParams;

export interface PercentileParams extends FormatParams {
  percentile: number;
}

export interface PercentileRanksParams extends FormatParams {
  value: number;
}

export interface LastValueParams extends FormatParams {
  sortField?: string;
  showArrayValues: boolean;
}

export interface MovingAverageParams {
  window: number;
}

export interface FormulaParams extends FormatParams {
  formula?: string;
  isFormulaBroken?: boolean;
}

export interface StaticValueParams extends FormatParams {
  value?: string;
}

export interface TimeScaleParams {
  unit?: string;
}
