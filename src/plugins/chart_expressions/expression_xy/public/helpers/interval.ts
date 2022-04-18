/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { search } from '@kbn/data-plugin/public';
import { XYChartProps } from '../../common';
import { getFilteredLayers } from './layers';
import { isDataLayer } from './visualization';

export function calculateMinInterval({ args: { layers } }: XYChartProps) {
  const filteredLayers = getFilteredLayers(layers);
  if (filteredLayers.length === 0) return;
  const isTimeViz = filteredLayers.every((l) => isDataLayer(l) && l.xScaleType === 'time');
  const xColumn = filteredLayers[0].table.columns.find(
    (column) => isDataLayer(filteredLayers[0]) && column.id === filteredLayers[0].xAccessor
  );

  if (!xColumn) return;
  if (!isTimeViz) {
    const histogramInterval = search.aggs.getNumberHistogramIntervalByDatatableColumn(xColumn);
    if (typeof histogramInterval === 'number') {
      return histogramInterval;
    } else {
      return undefined;
    }
  }
  const dateInterval = search.aggs.getDateHistogramMetaDataByDatatableColumn(xColumn)?.interval;
  if (!dateInterval) return;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return;
  return intervalDuration.as('milliseconds');
}
