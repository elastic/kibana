/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDebugSource } from './get_debug_source';
import { getFiberName } from './get_fiber_name';
import { getOwnerChain } from './get_owner_chain';
import { isComponentFiber, isSourceComponent } from './predicates';
import type { ComponentStackFrame, ReactFiberNode } from './types';

export const ANONYMOUS_COMPONENT_NAME = 'Anonymous';

/**
 * Application components own frames whether they have a name or not. EUI components and
 * other wrappers only run JSX written elsewhere (render props, children functions), so the
 * frame belongs to the component above them.
 */
const ownsFrame = (fiber: ReactFiberNode): boolean =>
  isSourceComponent(fiber) || (isComponentFiber(fiber) && getFiberName(fiber) === null);

/**
 * Builds the component stack of a fiber, closest first. A fiber's source points into the render
 * of its owner, so every fiber with source information is paired with the closest application
 * component among the fibers that rendered it. Unnamed components and JSX created outside of a
 * render are reported as {@link ANONYMOUS_COMPONENT_NAME} rather than attributed to a component
 * further up. Fibers without source information (compiled dependencies) are skipped.
 */
export const getComponentStack = (fiber: ReactFiberNode): ComponentStackFrame[] => {
  const chain = getOwnerChain(fiber);

  return chain.flatMap((current, index) => {
    const source = getDebugSource(current);
    if (!source) return [];

    const owner = current._debugOwner ? chain.slice(index + 1).find(ownsFrame) : null;
    const name = (owner && getFiberName(owner)) ?? ANONYMOUS_COMPONENT_NAME;

    return [{ name, source }];
  });
};
