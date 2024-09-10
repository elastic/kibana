/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createShape } from '../../reusable/shape_factory';

export const Hexagon = createShape({
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
