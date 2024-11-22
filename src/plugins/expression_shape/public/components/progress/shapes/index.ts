/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ShapeType } from '../../reusable';
import { Gauge as gauge } from './gauge';
import { HorizontalBar as horizontalBar } from './horizontal_bar';
import { HorizontalPill as horizontalPill } from './horizontal_pill';
import { Semicircle as semicircle } from './semicircle';
import { Unicorn as unicorn } from './unicorn';
import { VerticalBar as verticalBar } from './vertical_bar';
import { VerticalPill as verticalPill } from './vertical_pill';
import { Wheel as wheel } from './wheel';

const shapes: { [key: string]: ShapeType } = {
  gauge,
  horizontalBar,
  horizontalPill,
  semicircle,
  unicorn,
  verticalBar,
  verticalPill,
  wheel,
};

export const getShape = (shapeType: string) => shapes[shapeType];
