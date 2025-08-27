/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEuiMainComponent, isIgnoredComponent } from '../utils';
import { getFiberType } from './get_fiber_type';
import type { ReactFiberNode } from './types';

/**
 * Find the first EUI component in the fiber node's owner chain.
 * @param {ReactFiberNode} fiberNode The Fiber node.
 * @return {string | null} The EUI component name, or null if none is found.
 */
export const findFirstEuiComponent = (fiberNode: ReactFiberNode) => {
  let fiberCursor: ReactFiberNode | null | undefined = fiberNode;

  while (fiberCursor) {
    const type = getFiberType(fiberCursor);
    if (type && isEuiMainComponent(type) && !isIgnoredComponent(type)) {
      return type;
    }
    fiberCursor = fiberCursor._debugOwner;
  }
  return null;
};
