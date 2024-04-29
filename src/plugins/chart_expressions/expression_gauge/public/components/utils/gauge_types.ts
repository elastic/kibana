/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BulletProps, BulletSubtype } from '@elastic/charts';
import { GaugeShape, GaugeShapes } from '../../../common';

export const getSubtypeByGaugeType = (type: GaugeShape): BulletProps['subtype'] =>
  ((
    {
      [GaugeShapes.HORIZONTAL_BULLET]: BulletSubtype.horizontal,
      [GaugeShapes.VERTICAL_BULLET]: BulletSubtype.vertical,
      [GaugeShapes.SEMI_CIRCLE]: BulletSubtype.halfCircle,
      [GaugeShapes.ARC]: BulletSubtype.twoThirdsCircle,
      [GaugeShapes.CIRCLE]: BulletSubtype.circle,
    } as const
  )[type]);
