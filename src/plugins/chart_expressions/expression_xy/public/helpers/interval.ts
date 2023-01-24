/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { search } from '@kbn/data-plugin/public';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { XYChartProps } from '../../common';
import { isTimeChart } from '../../common/helpers';
import { getFilteredLayers } from './layers';
import { isDataLayer, getDataLayers } from './visualization';

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
