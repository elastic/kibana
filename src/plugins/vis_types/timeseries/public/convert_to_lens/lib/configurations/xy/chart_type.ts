/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SeriesType, SeriesTypes } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { Series } from '../../../../../common/types';
import { PANEL_TYPES } from '../../../../../common/enums';

export const getChartType = (series: Series, type: PANEL_TYPES): SeriesType => {
  let layerChartType: SeriesType = SeriesTypes.LINE;
  switch (series.chart_type) {
    case SeriesTypes.LINE:
      layerChartType = Number(series.fill) > 0 ? SeriesTypes.AREA : SeriesTypes.LINE;
      break;
    case SeriesTypes.AREA:
      layerChartType = SeriesTypes.AREA;
      break;
    case SeriesTypes.BAR:
      layerChartType = SeriesTypes.BAR;
      break;
  }

  if (type === PANEL_TYPES.TOP_N) {
    return SeriesTypes.BAR_HORIZONTAL;
  }

  if (series.stacked !== 'none' && series.stacked !== 'percent') {
    return layerChartType !== SeriesTypes.LINE ? `${layerChartType}_stacked` : SeriesTypes.LINE;
  }
  if (series.stacked === 'percent') {
    return layerChartType !== SeriesTypes.LINE
      ? `${layerChartType}_percentage_stacked`
      : SeriesTypes.LINE;
  }

  return layerChartType;
};
