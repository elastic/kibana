/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type DataType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'document'
  | 'ip'
  | 'histogram'
  | 'geo_point'
  | 'geo_shape'
  | 'murmur3';

export type TimeScaleUnit = 's' | 'm' | 'h' | 'd';

export type SortingHint = 'version';

export interface FilterQuery {
  query: string | { [key: string]: any };
  language: string;
}

export interface Filter {
  input: FilterQuery;
  label?: string;
}

export interface Range {
  from: number | null;
  to: number | null;
  label: string;
}

export interface NumberValueFormat {
  id: string;
  params?: {
    decimals: number;
    suffix?: string;
    fromUnit?: string;
    toUnit?: string;
  };
}

export interface MinMax {
  min: number;
  max: number;
}

export interface BasicFullPercentageModeConfig {
  isPercentageMode: boolean;
}

export interface BasicPercentageModeConfig {
  isPercentageMode: false;
}

export type PercentageModeConfigWithMinMax = BasicFullPercentageModeConfig & MinMax;

export type PercentageModeConfig = BasicPercentageModeConfig | PercentageModeConfigWithMinMax;
