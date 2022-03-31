/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SeriesTypes } from '../../common/constants';
import {
  BarIcon,
  LineIcon,
  AreaIcon,
  BarStackedIcon,
  AreaStackedIcon,
  BarHorizontalIcon,
  BarPercentageIcon,
  AreaPercentageIcon,
  BarHorizontalStackedIcon,
  BarHorizontalPercentageIcon,
} from '../icons';

export const visualizationDefinitions = [
  { id: SeriesTypes.BAR, icon: BarIcon },
  { id: SeriesTypes.BAR_STACKED, icon: BarStackedIcon },
  { id: SeriesTypes.BAR_HORIZONTAL, icon: BarHorizontalIcon },
  { id: SeriesTypes.BAR_PERCENTAGE_STACKED, icon: BarPercentageIcon },
  { id: SeriesTypes.BAR_HORIZONTAL_STACKED, icon: BarHorizontalStackedIcon },
  { id: SeriesTypes.BAR_HORIZONTAL_PERCENTAGE_STACKED, icon: BarHorizontalPercentageIcon },
  { id: SeriesTypes.LINE, icon: LineIcon },
  { id: SeriesTypes.AREA, icon: AreaIcon },
  { id: SeriesTypes.AREA_STACKED, icon: AreaStackedIcon },
  { id: SeriesTypes.AREA_PERCENTAGE_STACKED, icon: AreaPercentageIcon },
];
