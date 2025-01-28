/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  IconChartBarHorizontalPercentage,
  IconChartBarHorizontalStacked,
  IconChartBarPercentage,
  IconChartBarHorizontal,
  IconChartAreaStacked,
  IconChartBarStacked,
  IconChartLine,
  IconChartBar,
  IconChartArea,
  IconChartAreaPercentage,
} from '@kbn/chart-icons';
import { SeriesTypes } from '../../common/constants';

export const visualizationDefinitions = [
  { id: SeriesTypes.BAR, icon: IconChartBar },
  { id: `${SeriesTypes.BAR}_stacked`, icon: IconChartBarStacked },
  { id: `${SeriesTypes.BAR}_horizontal`, icon: IconChartBarHorizontal },
  { id: `${SeriesTypes.BAR}_percentage_stacked`, icon: IconChartBarPercentage },
  { id: `${SeriesTypes.BAR}_horizontal_stacked`, icon: IconChartBarHorizontalStacked },
  {
    id: `${SeriesTypes.BAR}_horizontal_percentage_stacked`,
    icon: IconChartBarHorizontalPercentage,
  },
  { id: `${SeriesTypes.LINE}_stacked`, icon: IconChartLine },
  { id: SeriesTypes.LINE, icon: IconChartLine },
  { id: SeriesTypes.AREA, icon: IconChartArea },
  { id: `${SeriesTypes.AREA}_stacked`, icon: IconChartAreaStacked },
  { id: `${SeriesTypes.AREA}_percentage_stacked`, icon: IconChartAreaPercentage },
];
