/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clamp } from 'lodash';
import { ResizableLayoutDirection } from '../types';

export const percentToPixels = (containerSize: number, percentage: number) =>
  Math.round(containerSize * (percentage / 100));

export const pixelsToPercent = (containerSize: number, pixels: number) =>
  clamp((pixels / containerSize) * 100, 0, 100);

export const getContainerSize = (
  direction: ResizableLayoutDirection,
  width: number,
  height: number
) => (direction === ResizableLayoutDirection.Vertical ? height : width);
