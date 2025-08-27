/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isIgnoredComponent } from '../utils';
import type { ReactFiberNode, ReactFiberNodeWithDomElement } from './types';
import { getFiberType } from './get_fiber_type';

/**
 * Find the first non-ignored component type in the fiber node's owner chain.
 * @param {ReactFiberNodeWithDomElement} fiberNode The Fiber node.
 * @return {string | null} The first non-ignored component type, or null if none is found.
 */
export const findFirstNonIgnoredComponent = (
  fiberNode: ReactFiberNodeWithDomElement
): string | null => {
  let fiberCursor: ReactFiberNode | null | undefined = fiberNode;

  while (fiberCursor) {
    const type = getFiberType(fiberCursor);
    // Sometimes components have type EmotionCssPropInternal - not sure if anything can be done about it.
    if (type && !isIgnoredComponent(type)) {
      return type;
    }
    fiberCursor = fiberCursor._debugOwner;
  }
  return null;
};
