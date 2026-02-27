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
 * Get the display name of a {@link ReactFiberNode React Fiber node}.
 * @param {ReactFiberNode} fiber {@link ReactFiberNode React Fiber node} to get the display name for.
 * @return {string | null} The display name of the {@link ReactFiberNode React Fiber node}, or null if it cannot be determined.
 */
export const getFiberType = (fiber: ReactFiberNode): string | null => {
  if (typeof fiber.type === 'string') {
    return fiber.type;
  } else if (typeof fiber.type?.name === 'string') {
    return fiber.type?.name;
  } else if (typeof fiber.type?.displayName === 'string') {
    return fiber.type?.displayName;
  } else if (typeof fiber?.elementType === 'string') {
    return fiber?.elementType;
  }

  return null;
};
