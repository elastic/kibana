/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createShape } from '../../reusable/shape_factory';

export const Bookmark = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 60,
    height: 100,
  },
  shapeProps: {
    points: '0,0 60,0 60,95 30,75 0,95 0,0',
  },
});
