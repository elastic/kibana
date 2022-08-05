/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Series } from '../../../../common/types';

export const convertChartType = (series: Series) => {
  const layerChartType =
    series.chart_type === 'line' && Number(series.fill) > 0 ? 'area' : series.chart_type;

  if (series.stacked !== 'none' && series.stacked !== 'percent') {
    return layerChartType !== 'line' ? `${layerChartType}_stacked` : 'line';
  }
  if (series.stacked === 'percent') {
    return layerChartType !== 'line' ? `${layerChartType}_percentage_stacked` : 'line';
  }

  return layerChartType;
};
