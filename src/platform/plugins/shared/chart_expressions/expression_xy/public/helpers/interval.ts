/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { search } from '@kbn/data-plugin/public';
import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import type { XYChartProps } from '../../common';
import { isTimeChart } from '../../common/helpers';
import { getFilteredLayers } from './layers';
import { isDataLayer, getDataLayers } from './visualization';

const DURATION_UNITS = {
  second: 's',
  seconds: 's',
  minute: 'm',
  minutes: 'm',
  hour: 'h',
  hours: 'h',
  day: 'd',
  week: 'w',
  weeks: 'w',
  month: 'M',
  months: 'M',
  year: 'y',
  years: 'y',
};

const isDurationUnit = (unit: string): unit is keyof typeof DURATION_UNITS => {
  return unit in DURATION_UNITS;
};

const normaliseUnit = (unit: string) => {
  if (isDurationUnit(unit)) {
    return DURATION_UNITS[unit];
  }
  return unit;
};

export function calculateMinInterval(
  datatableUtilities: DatatableUtilitiesService,
  { args: { layers, minTimeBarInterval } }: XYChartProps
) {
  const filteredLayers = getFilteredLayers(layers);
  if (filteredLayers.length === 0) return;
  const isTimeViz = isTimeChart(getDataLayers(filteredLayers));
  const xColumn =
    isDataLayer(filteredLayers[0]) &&
    filteredLayers[0].xAccessor &&
    getColumnByAccessor(filteredLayers[0].xAccessor, filteredLayers[0].table.columns);

  if (!xColumn) return;

  const bucket = xColumn.meta.bucket;

  if (bucket) {
    if (bucket.unit) {
      const durationString = `${bucket.interval}${normaliseUnit(bucket.unit)}`;
      const duration = search.aggs.parseInterval(durationString)?.as('milliseconds');
      return duration;
    }

    return bucket.interval;
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
