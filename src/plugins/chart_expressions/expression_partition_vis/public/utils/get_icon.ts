/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IconChartWaffle,
  IconChartMosaic,
  IconChartPie,
  IconChartDonut,
  IconChartTreemap,
} from '@kbn/chart-icons';
import { ChartTypes } from '../../common/types';

export const getIcon = (chart: ChartTypes) =>
  ({
    [ChartTypes.PIE]: IconChartPie,
    [ChartTypes.DONUT]: IconChartDonut,
    [ChartTypes.TREEMAP]: IconChartTreemap,
    [ChartTypes.MOSAIC]: IconChartMosaic,
    [ChartTypes.WAFFLE]: IconChartWaffle,
  }[chart]);
