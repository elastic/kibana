/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HOST_ROOT_TAG } from './constants';
import type { ReactFiberNode, ReactFiberRoot } from './types';

/**
 * The root a fiber was rendered into, `null` once it is unmounted. Content rendered through a
 * portal belongs to the root of the component that rendered it, not to the portal's container.
 */
export const getFiberRoot = (fiber: ReactFiberNode): ReactFiberRoot | null => {
  let top = fiber;
  while (top.return) top = top.return;

  // Unmounted fibers lose their `return`, so the walk may end below the topmost fiber of a tree.
  return top.tag === HOST_ROOT_TAG ? (top.stateNode as ReactFiberRoot) : null;
};
