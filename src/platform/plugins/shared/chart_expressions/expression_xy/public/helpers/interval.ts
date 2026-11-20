/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { search } from '@kbn/data-plugin/public';
import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig, XYChartProps } from '../../common';
import { isTimeChart } from '../../common/helpers';
import { getFilteredLayers } from './layers';
import { isDataLayer, getDataLayers } from './visualization';

export function calculateMinInterval(
  datatableUtilities: DatatableUtilitiesService,
  { args: { layers, minTimeBarInterval } }: XYChartProps
) {
  const filteredLayers = getFilteredLayers(layers);
  if (filteredLayers.length === 0) return;
  const isTimeVis = isTimeChart(getDataLayers(filteredLayers));
  const xColumn =
    isDataLayer(filteredLayers[0]) &&
    filteredLayers[0].xAccessor &&
    getColumnByAccessor(filteredLayers[0].xAccessor, filteredLayers[0].table.columns);

  if (!xColumn) return;
  if (minTimeBarInterval) {
    return search.aggs.parseInterval(minTimeBarInterval)?.as('milliseconds');
  }
  if (!isTimeVis) {
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

/**
 * Returns a function computing where a bucket of the layer's X column ends, or `undefined` when the column has no known interval.
 * Date intervals follow the calendar in `timeZone`, so months, years and days across DST changes get their actual length.
 */
export const getLayerBucketEnd = (
  datatableUtilities: DatatableUtilitiesService,
  { xAccessor, table }: CommonXYDataLayerConfig,
  timeZone: string
): ((bucketStart: number) => number) | undefined => {
  const xColumn = xAccessor ? getColumnByAccessor(xAccessor, table.columns) : undefined;
  if (!xColumn) {
    return undefined;
  }
  const dateInterval = datatableUtilities.getDateHistogramMeta(xColumn)?.interval;
  const dateDuration = dateInterval ? search.aggs.parseInterval(dateInterval) : null;
  if (dateDuration) {
    return (bucketStart) => moment.tz(bucketStart, timeZone).add(dateDuration).valueOf();
  }
  const numberInterval = datatableUtilities.getNumberHistogramInterval(xColumn);
  return typeof numberInterval === 'number'
    ? (bucketStart) => bucketStart + numberInterval
    : undefined;
};
