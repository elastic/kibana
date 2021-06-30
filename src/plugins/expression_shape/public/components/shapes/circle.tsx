/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SvgElementTypes } from '../types';
import { getShapeComponent } from '../shape';

export const Circle = getShapeComponent({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  },
  shapeProps: {
    r: '45',
    cx: '50',
    cy: '50',
  },
  shapeType: SvgElementTypes.circle,
});
