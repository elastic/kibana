/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IconChartHorizontalBullet,
  IconChartVerticalBullet,
  IconChartGaugeSemiCircle,
  IconChartGaugeArc,
  IconChartGaugeCircle,
} from '@kbn/chart-icons';
import { GaugeShape, GaugeShapes } from '../../../common';

export const getGaugeIconByType = (type: GaugeShape) =>
  ({
    [GaugeShapes.HORIZONTAL_BULLET]: IconChartHorizontalBullet,
    [GaugeShapes.VERTICAL_BULLET]: IconChartVerticalBullet,
    [GaugeShapes.SEMI_CIRCLE]: IconChartGaugeSemiCircle,
    [GaugeShapes.ARC]: IconChartGaugeArc,
    [GaugeShapes.CIRCLE]: IconChartGaugeCircle,
  }[type]);
