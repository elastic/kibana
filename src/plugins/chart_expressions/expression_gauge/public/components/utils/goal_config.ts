/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { GoalProps } from '@elastic/charts';
import { GaugeShape, GaugeShapes } from '../../../common';

const getCicleConfig = () => ({
  angleStart: Math.PI / 2,
  angleEnd: -(Math.PI + Math.PI / 2),
});

const getArcConfig = () => ({
  angleStart: Math.PI + (Math.PI - (2 * Math.PI) / 2.5) / 2,
  angleEnd: -(Math.PI - (2 * Math.PI) / 2.5) / 2,
});

const empty = () => ({});

export const getGoalConfig = (type: GaugeShape): Partial<GoalProps> =>
  ({
    [GaugeShapes.HORIZONTAL_BULLET]: empty,
    [GaugeShapes.VERTICAL_BULLET]: empty,
    [GaugeShapes.ARC]: getArcConfig,
    [GaugeShapes.CIRCLE]: getCicleConfig,
  }[type]());
