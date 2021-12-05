/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position, RecursivePartial, AxisStyle } from '@elastic/charts';

export const MULTILAYER_TIME_AXIS_STYLE: RecursivePartial<AxisStyle> = {
  tickLabel: {
    visible: true,
    padding: 0,
    rotation: 0,
    alignment: {
      vertical: Position.Bottom,
      horizontal: Position.Left,
    },
  },
  tickLine: {
    visible: true,
    size: 0.0001,
    padding: 4,
  },
};
