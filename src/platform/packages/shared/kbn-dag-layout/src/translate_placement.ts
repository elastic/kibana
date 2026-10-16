/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagReservedLanePlacement } from './types';

/** Moves a lane placement by an x/y offset, mapping it onto the main/cross axes of the layout direction. */
export const translatePlacement = (
  placement: DagReservedLanePlacement,
  offsetX: number,
  offsetY: number,
  isLR: boolean
): DagReservedLanePlacement => {
  const mainOffset = isLR ? offsetX : offsetY;
  const crossOffset = isLR ? offsetY : offsetX;
  return {
    ...placement,
    mainStart: placement.mainStart + mainOffset,
    mainEnd: placement.mainEnd + mainOffset,
    crossStart: placement.crossStart + crossOffset,
    crossEnd: placement.crossEnd + crossOffset,
  };
};
