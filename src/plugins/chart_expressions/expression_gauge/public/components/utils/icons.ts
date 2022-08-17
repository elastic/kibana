/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IconChartHorizontalBullet, IconChartVerticalBullet } from '@kbn/chart-icons';
import { GaugeShape, GaugeShapes } from '../../../common';

export const getIcons = (type: GaugeShape) =>
  ({
    [GaugeShapes.HORIZONTAL_BULLET]: IconChartHorizontalBullet,
    [GaugeShapes.VERTICAL_BULLET]: IconChartVerticalBullet,
    [GaugeShapes.ARC]: 'visGoal',
    [GaugeShapes.CIRCLE]: 'visGoal',
  }[type]);
