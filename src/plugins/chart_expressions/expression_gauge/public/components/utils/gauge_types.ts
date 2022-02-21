/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GoalProps } from '@elastic/charts';
import { GaugeShape, GaugeShapes } from '../../../common';

export const getSubtypeByGaugeType = (type: GaugeShape): GoalProps['subtype'] =>
  ((
    {
      [GaugeShapes.HORIZONTAL_BULLET]: 'horizontalBullet',
      [GaugeShapes.VERTICAL_BULLET]: 'verticalBullet',
      [GaugeShapes.ARC]: 'goal',
      [GaugeShapes.CIRCLE]: 'goal',
    } as const
  )[type]);
