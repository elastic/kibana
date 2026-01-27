/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export interface DateHistogramParams {
  date: boolean;
  interval: number;
  intervalESValue: number;
  intervalESUnit: string;
  format: string;
  bounds?: {
    min: string | number;
    max: string | number;
  };
}

export interface HistogramParams {
  interval: number;
}

export interface FakeParams {
  defaultValue: string;
}

export type ExpressionValueXYDimension = ExpressionValueBoxed<
  'xy_dimension',
  {
    label: string;
    aggType: string;
    params: DateHistogramParams | HistogramParams | FakeParams | {};
    accessor: number | DatatableColumn;
    format: SerializedFieldFormat;
  }
>;
