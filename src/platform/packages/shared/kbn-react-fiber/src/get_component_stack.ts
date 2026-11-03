/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberName } from './get_fiber_name';
import { getOwnerChain } from './get_owner_chain';
import { hasDebugSource, isSourceComponent } from './predicates';
import type { ComponentStackFrame, ReactFiberNode } from './types';

/**
 * Builds the component stack of a fiber, closest first. A fiber's source points into the render
 * of its owner, so every fiber with source information is paired with the closest application
 * component above it. Fibers without source information (compiled dependencies) are skipped.
 */
export const getComponentStack = (fiber: ReactFiberNode): ComponentStackFrame[] => {
  const chain = getOwnerChain(fiber);

  return chain.flatMap((current, index) => {
    if (!hasDebugSource(current)) return [];

    const owner = chain.slice(index + 1).find(isSourceComponent);
    const name = owner ? getFiberName(owner) : null;

    return name ? [{ name, source: current._debugSource }] : [];
  });
};
