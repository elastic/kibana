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
  { id: `${SeriesTypes.BAR}_stacked`, icon: BarStackedIcon },
  { id: `${SeriesTypes.BAR}_horizontal`, icon: BarHorizontalIcon },
  { id: `${SeriesTypes.BAR}_percentage_stacked`, icon: BarPercentageIcon },
  { id: `${SeriesTypes.BAR}_horizontal_stacked`, icon: BarHorizontalStackedIcon },
  { id: `${SeriesTypes.BAR}_horizontal_percentage_stacked`, icon: BarHorizontalPercentageIcon },
  { id: SeriesTypes.LINE, icon: LineIcon },
  { id: SeriesTypes.AREA, icon: AreaIcon },
  { id: `${SeriesTypes.AREA}_stacked`, icon: AreaStackedIcon },
  { id: `${SeriesTypes.AREA}_percentage_stacked`, icon: AreaPercentageIcon },
];
