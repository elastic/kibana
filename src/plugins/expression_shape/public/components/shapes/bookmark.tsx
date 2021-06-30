/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getShapeComponent } from '../shape';

export const Bookmark = getShapeComponent({
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
