/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDebugSource } from './get_debug_source';
import { getFiberFromElement } from './get_fiber_from_element';
import { getOwnerChain } from './get_owner_chain';
import type { ElementFiber } from './types';

/**
 * Finds the closest fiber with source information for a DOM element, together with that
 * information. The owner chain of the element's own fiber is searched first, then the chains of
 * its ancestors, which covers elements rendered by compiled dependencies such as EUI.
 */
export const findFiberWithDebugSource = (element: HTMLElement): ElementFiber | null => {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const fiber = getFiberFromElement(current);

    for (const candidate of fiber ? getOwnerChain(fiber) : []) {
      const source = getDebugSource(candidate);

      if (source) {
        return { element: current, fiber: candidate, source };
      }
    }
  }

  return null;
};
