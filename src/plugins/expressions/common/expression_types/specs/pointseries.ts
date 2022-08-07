/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import { Datatable, DatatableRow } from './datatable';
import { ExpressionValueRender } from './render';

const name = 'pointseries';

export const PointSeriesColumnNames = {
  X: 'x',
  Y: 'y',
  COLOR: 'color',
  SIZE: 'size',
  TEXT: 'text',
} as const;

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

export const pointseries: ExpressionTypeDefinition<'pointseries', PointSeries> = {
  name,
  from: {
    null: () => {
      return {
        type: name,
        rows: [],
        columns: {},
      };
    },
  },
  to: {
    render: (
      pseries: PointSeries,
      types
    ): ExpressionValueRender<{ datatable: Datatable; showHeader: boolean }> => {
      const datatable: Datatable = types.datatable.from(pseries, types);
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          showHeader: true,
        },
      };
    },
  },
};
