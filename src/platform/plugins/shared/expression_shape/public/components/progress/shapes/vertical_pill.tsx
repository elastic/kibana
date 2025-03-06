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

export const VerticalPill = createShape({
  viewBox: {
    minX: 0,
    minY: -8,
    width: 1,
    height: 208,
  },
  shapeType: SvgElementTypes.path,
  shapeProps: {
    d: 'M 1 200 L 1 0',
    strokeLinecap: 'round',
  },
  textAttributes: {
    x: '0',
    y: '-8',
    textAnchor: 'middle',
  },
});
