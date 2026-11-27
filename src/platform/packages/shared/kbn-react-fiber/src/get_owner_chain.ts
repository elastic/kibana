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
 * Lists a fiber followed by the fibers that rendered it, closest first. Elements created
 * outside of a render (static JSX, event handlers) have no owner, the tree parent is used instead.
 */
export const getOwnerChain = (fiber: ReactFiberNode): ReactFiberNode[] => {
  const chain: ReactFiberNode[] = [];
  let current: ReactFiberNode | null | undefined = fiber;

  while (current) {
    chain.push(current);
    current = current._debugOwner ?? current.return;
  }

  return chain;
};
