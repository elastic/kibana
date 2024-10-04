/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Arrow as arrow } from './arrow';
import { ArrowMulti as arrowMulti } from './arrow_multi';
import { Bookmark as bookmark } from './bookmark';
import { Cross as cross } from './cross';
import { Circle as circle } from './circle';
import { Hexagon as hexagon } from './hexagon';
import { Kite as kite } from './kite';
import { Pentagon as pentagon } from './pentagon';
import { Rhombus as rhombus } from './rhombus';
import { Semicircle as semicircle } from './semicircle';
import { SpeechBubble as speechBubble } from './speech_bubble';
import { Square as square } from './square';
import { Star as star } from './star';
import { Tag as tag } from './tag';
import { Triangle as triangle } from './triangle';
import { TriangleRight as triangleRight } from './triangle_right';
import { ShapeType } from '../../reusable';

const shapes: { [key: string]: ShapeType } = {
  arrow,
  arrowMulti,
  bookmark,
  cross,
  circle,
  hexagon,
  kite,
  pentagon,
  rhombus,
  semicircle,
  speechBubble,
  square,
  star,
  tag,
  triangle,
  triangleRight,
};

export const getShape = (shapeType: string) => shapes[shapeType];
