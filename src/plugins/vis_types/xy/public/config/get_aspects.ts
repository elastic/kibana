/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact } from 'lodash';

import { i18n } from '@kbn/i18n';

import { DatatableColumn } from '@kbn/expressions-plugin/public';

import { Aspect, Dimension, Aspects, Dimensions } from '../types';
import { getFormatService } from '../services';
import { getAggId } from './get_agg_id';

export function getEmptyAspect(): Aspect {
  return {
    accessor: null,
    aggId: null,
    aggType: null,
    title: i18n.translate('visTypeXy.aggResponse.allDocsTitle', {
      defaultMessage: 'All docs',
    }),
    params: {
      defaultValue: '_all',
    },
  };
}
export function getAspects(
  columns: DatatableColumn[],
  { x, y, z, series, splitColumn, splitRow }: Dimensions
): Aspects {
  const seriesDimensions = Array.isArray(series) || series === undefined ? series : [series];

  return {
    x: getAspectsFromDimension(columns, x) ?? getEmptyAspect(),
    y: getAspectsFromDimension(columns, y) ?? [],
    z: z && z?.length > 0 ? getAspectsFromDimension(columns, z[0]) : undefined,
    series: getAspectsFromDimension(columns, seriesDimensions),
    splitColumn: splitColumn?.length ? getAspectsFromDimension(columns, splitColumn[0]) : undefined,
    splitRow: splitRow?.length ? getAspectsFromDimension(columns, splitRow[0]) : undefined,
  };
}

function getAspectsFromDimension(
  columns: DatatableColumn[],
  dimension?: Dimension | null
): Aspect | undefined;
function getAspectsFromDimension(
  columns: DatatableColumn[],
  dimensions?: Dimension[] | null
): Aspect[] | undefined;
function getAspectsFromDimension(
  columns: DatatableColumn[],
  dimensions?: Dimension | Dimension[] | null
): Aspect[] | Aspect | undefined {
  if (!dimensions) {
    return;
  }

  if (Array.isArray(dimensions)) {
    return compact(
      dimensions.map((d) => {
        const column = d && columns[d.accessor];
        return column && getAspect(column, d);
      })
    );
  }

  const column = columns[dimensions.accessor];
  return column && getAspect(column, dimensions);
}

const getAspect = (
  { id: accessor, name: title }: DatatableColumn,
  { accessor: column, format, params, aggType }: Dimension
): Aspect => ({
  accessor,
  column,
  title,
  format,
  aggType,
  aggId: getAggId(accessor),
  formatter: (value: any) => getFormatService().deserialize(format).convert(value),
  params,
});
