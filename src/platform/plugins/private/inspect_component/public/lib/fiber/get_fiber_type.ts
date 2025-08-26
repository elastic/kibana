/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactFiberNode } from './types';

/**
 * Get the display name of the fiber node.
 * @param {ReactFiberNode} fiberNode The React Fiber node.
 * @return {string | null} The display name of the fiber node, or null if it cannot be determined.
 */
export const getFiberType = (fiberNode: ReactFiberNode): string | null => {
  if (typeof fiberNode.type === 'string') {
    return fiberNode.type;
  } else if (typeof fiberNode.type?.name === 'string') {
    return fiberNode.type?.name;
  } else if (typeof fiberNode.type?.displayName === 'string') {
    return fiberNode.type?.displayName;
  } else if (typeof fiberNode.elementType === 'string') {
    return fiberNode.elementType;
  }

  return null;
};
