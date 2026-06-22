/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import { ESQL_TABLE_TYPE, type DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { search } from '@kbn/data-plugin/public';
import { isSourceParamsESQL } from '@kbn/expressions-plugin/public';
import moment from 'moment';
import type { XYChartProps } from '../../common';
import { isTimeChart } from '../../common/helpers';
import { getFilteredLayers } from './layers';
import { getDataLayers, isDataLayer } from './visualization';

const ESQL_UNITS = [
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const satisfies readonly moment.unitOfTime.DurationConstructor[];

type Unit = (typeof ESQL_UNITS)[number];

const isUnit = (s: string): s is Unit => (ESQL_UNITS as readonly string[]).includes(s);

const esqlTimeBucketToMs = (interval: number, unit: string): number | undefined =>
  isUnit(unit) ? moment.duration(interval, unit).asMilliseconds() : undefined;

export function calculateMinInterval(
  datatableUtilities: DatatableUtilitiesService,
  { args: { layers, minTimeBarInterval } }: XYChartProps
) {
  const filteredLayers = getFilteredLayers(layers);
  if (filteredLayers.length === 0) return;
  const isTimeViz = isTimeChart(getDataLayers(filteredLayers));
  const isEsqlMode = filteredLayers.some((l) => l.table?.meta?.type === ESQL_TABLE_TYPE);

  const xColumn =
    isDataLayer(filteredLayers[0]) &&
    filteredLayers[0].xAccessor &&
    getColumnByAccessor(filteredLayers[0].xAccessor, filteredLayers[0].table.columns);

  if (!xColumn) return;

  if (isEsqlMode && xColumn.meta.sourceParams && isSourceParamsESQL(xColumn.meta.sourceParams)) {
    const bucket = xColumn.meta.sourceParams.bucket;
    if (!bucket) return undefined;
    const { interval, unit } = bucket;
    return unit ? esqlTimeBucketToMs(interval, unit) : interval;
  }

  if (minTimeBarInterval) {
    return search.aggs.parseInterval(minTimeBarInterval)?.as('milliseconds');
  }
  if (!isTimeViz) {
    const histogramInterval = datatableUtilities.getNumberHistogramInterval(xColumn);
    if (typeof histogramInterval === 'number') {
      return histogramInterval;
    } else {
      return undefined;
    }
  }
  const dateInterval = datatableUtilities.getDateHistogramMeta(xColumn)?.interval;
  if (!dateInterval) return;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return;
  return intervalDuration.as('milliseconds');
}
