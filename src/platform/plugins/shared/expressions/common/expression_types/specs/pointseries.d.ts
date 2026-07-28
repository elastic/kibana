/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { $Values } from '@kbn/utility-types';
import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import type { DatatableRow } from './datatable';
export declare const PointSeriesColumnNames: {
  readonly X: 'x';
  readonly Y: 'y';
  readonly COLOR: 'color';
  readonly SIZE: 'size';
  readonly TEXT: 'text';
};
/**
 * Allowed column names in a PointSeries
 */
export type PointSeriesColumnName = $Values<typeof PointSeriesColumnNames>;
/**
 * Column in a PointSeries
 */
export interface PointSeriesColumn {
  type: 'number' | 'string';
  role: 'measure' | 'dimension';
  expression: string;
}
/**
 * Represents a collection of valid Columns in a PointSeries
 */
export type PointSeriesColumns = Record<PointSeriesColumnName, PointSeriesColumn> | {};
export type PointSeriesRow = DatatableRow;
/**
 * A `PointSeries` is a unique structure that represents dots on a chart.
 */
export type PointSeries = ExpressionValueBoxed<
  'pointseries',
  {
    columns: PointSeriesColumns;
    rows: PointSeriesRow[];
  }
>;
export declare const pointseries: ExpressionTypeDefinition<'pointseries', PointSeries>;
