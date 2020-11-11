/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { compact } from 'lodash';

import { i18n } from '@kbn/i18n';

import { DatatableColumn } from '../../../expressions/public';

import { Aspect, Dimension, Aspects, Dimensions } from '../types';
import { getFormatService } from '../services';

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
export function getAspects(columns: DatatableColumn[], { x, y, z, series }: Dimensions): Aspects {
  const seriesDimensions = Array.isArray(series) || series === undefined ? series : [series];

  return {
    x: getAspectsFromDimension(columns, x) ?? getEmptyAspect(),
    y: getAspectsFromDimension(columns, y) ?? [],
    z: z && z?.length > 0 ? getAspectsFromDimension(columns, z[0]) : undefined,
    series: getAspectsFromDimension(columns, seriesDimensions),
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

/**
 * Get agg id from accessor
 *
 * For now this is determined by the esaggs column name. Could be cleaned up in the future.
 */
export const getAggId = (accessor: string) => (accessor ?? '').split('-').pop() ?? '';

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
