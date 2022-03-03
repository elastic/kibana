/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GaugeShape, GaugeShapes } from '../../../common';
import { HorizontalBulletIcon } from '../icons';

export const getIcons = (type: GaugeShape) =>
  ({
    [GaugeShapes.HORIZONTAL_BULLET]: HorizontalBulletIcon,
    [GaugeShapes.VERTICAL_BULLET]: HorizontalBulletIcon,
    [GaugeShapes.ARC]: 'visGoal',
    [GaugeShapes.CIRCLE]: 'visGoal',
  }[type]);
