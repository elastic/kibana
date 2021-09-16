/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueBoxed } from '../../../../../expressions';
import { Scale } from '../param';

export type ExpressionValueScale = ExpressionValueBoxed<
  'vis_scale',
  {
    boundsMargin?: Scale['boundsMargin'];
    defaultYExtents?: Scale['defaultYExtents'];
    max?: Scale['max'];
    min?: Scale['min'];
    mode?: Scale['mode'];
    setYExtents?: Scale['setYExtents'];
    scaleType: Scale['type'];
  }
>;

export type ExpressionValueScaleArguments = Scale;
