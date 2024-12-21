/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createShape } from '../../reusable/shape_factory';

export const SpeechBubble = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  },
  shapeProps: {
    points: '0,0 100,0 100,70 40,70 20,85 25,70 0,70',
    strokeLinejoin: 'round',
  },
});
