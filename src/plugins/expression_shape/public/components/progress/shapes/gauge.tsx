/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createShape } from '../../reusable/shape_factory';
import { SvgElementTypes } from '../../reusable';

export const Gauge = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 120,
    height: 120,
  },
  shapeProps: {
    d: 'M 15 100 A 60 60 0 1 1 105 100',
  },
  shapeType: SvgElementTypes.path,
  textAttributes: {
    x: '60',
    y: '60',
    textAnchor: 'middle',
    dominantBaseline: 'central',
  },
});
