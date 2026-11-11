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
import { isEuiComponentName, isIgnoredComponentName } from './predicates';
import type { ReactFiberNode } from './types';

/**
 * Name of the closest EUI component responsible for a fiber, starting with the fiber itself.
 * `isCandidate` narrows the match further, e.g. to public components only.
 */
export const findEuiComponentName = (
  fiber: ReactFiberNode,
  isCandidate: (name: string) => boolean = () => true
): string | null => {
  for (const current of getOwnerChain(fiber)) {
    const name = getFiberName(current);

    if (name && isEuiComponentName(name) && !isIgnoredComponentName(name) && isCandidate(name)) {
      return name;
    }
  }

  return null;
};
