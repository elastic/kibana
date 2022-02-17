/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { vislibPointSeriesTypes as pointSeries } from './point_series';
import { vislibPieConfig } from './pie';
import { vislibGaugeConfig } from './gauge';

export const vislibTypesConfig = {
  pie: vislibPieConfig,
  heatmap: pointSeries.heatmap,
  gauge: vislibGaugeConfig,
  goal: vislibGaugeConfig,
  metric: vislibGaugeConfig,
};
