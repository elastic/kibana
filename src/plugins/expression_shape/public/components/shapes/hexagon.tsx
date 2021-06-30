/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getShapeComponent } from '../shape';

export const Hexagon = getShapeComponent({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  },
  shapeProps: {
    points:
      '70.000, 15.359 30.000, 15.359 10.000, 50.000 30.000, 84.641 70.000, 84.641 90.000, 50.000',
  },
});
