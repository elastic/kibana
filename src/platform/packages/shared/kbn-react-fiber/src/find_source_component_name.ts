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
import { isSourceComponent } from './predicates';
import type { ReactFiberNode } from './types';

/** Name of the closest application component responsible for a fiber, starting with the fiber itself. */
export const findSourceComponentName = (fiber: ReactFiberNode): string | null => {
  const sourceComponent = getOwnerChain(fiber).find(isSourceComponent);

  return sourceComponent ? getFiberName(sourceComponent) : null;
};
