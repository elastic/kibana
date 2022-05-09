/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GaugeShapes } from '../constants';
import { GaugeShape } from '../types';

export const isRoundShape = (shape: GaugeShape) => {
  const roundShapes: string[] = [GaugeShapes.ARC, GaugeShapes.CIRCLE];
  return roundShapes.includes(shape);
};

export const isBulletShape = (shape: GaugeShape) => {
  const bulletShapes: string[] = [GaugeShapes.HORIZONTAL_BULLET, GaugeShapes.VERTICAL_BULLET];
  return bulletShapes.includes(shape);
};
