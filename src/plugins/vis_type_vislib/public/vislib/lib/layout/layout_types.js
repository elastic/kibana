/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { columnLayout } from './types/column_layout';
import { pieLayout } from './types/pie_layout';
import { gaugeLayout } from './types/gauge_layout';

export const layoutTypes = {
  pie: pieLayout,
  gauge: gaugeLayout,
  goal: gaugeLayout,
  metric: gaugeLayout,
  point_series: columnLayout,
};
