/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartTypes } from '../../common/types';
import { PieIcon, DonutIcon, TreemapIcon, MosaicIcon, WaffleIcon } from '../icons';

export const getIcon = (chart: ChartTypes) =>
  ({
    [ChartTypes.PIE]: PieIcon,
    [ChartTypes.DONUT]: DonutIcon,
    [ChartTypes.TREEMAP]: TreemapIcon,
    [ChartTypes.MOSAIC]: MosaicIcon,
    [ChartTypes.WAFFLE]: WaffleIcon,
  }[chart]);
