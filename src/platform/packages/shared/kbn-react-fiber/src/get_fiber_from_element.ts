/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FIBER_KEY_PREFIX } from './constants';
import type { ReactFiberNode } from './types';

/** Returns the fiber React attached to a DOM node, or null when the node was not rendered by React. */
export const getFiberFromElement = (element: Node | null): ReactFiberNode | null => {
  if (!element) return null;

  const fiberEntry = Object.entries(element).find(([key]) => key.startsWith(FIBER_KEY_PREFIX));

  return fiberEntry ? (fiberEntry[1] as ReactFiberNode) : null;
};
