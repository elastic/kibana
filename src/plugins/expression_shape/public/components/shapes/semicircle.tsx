/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createShape, SvgElementTypes } from '../../../../presentation_util/public';

const Semicircle = createShape({
  viewBox: {
    minX: 0,
    minY: 0,
    width: 100,
    height: 100,
  },
  shapeProps: {
    d: 'M 5,50 h 90 A 45 45 180 1 0 5,50 Z',
  },
  shapeType: SvgElementTypes.path,
});

// eslint-disable-next-line import/no-default-export
export default Semicircle;
