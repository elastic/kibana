/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getShapeComponent } from '../../../../presentation_util/public';

export const Kite = getShapeComponent({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 150,
  },
  shapeProps: {
    points: '50,10 10,50 50,140 90,50',
  },
});
