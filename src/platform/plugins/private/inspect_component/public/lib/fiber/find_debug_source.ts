/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode } from './types';
import { getFiberFromDomNode } from './get_fiber_from_dom_node';

/**
 * Find the nearest _debugSource by traversing up the DOM and React Fiber tree.
 * @param {HTMLElement|SVGElement} node The DOM node.
 * @return {DebugSource|undefined} The debug source information, or undefined if not found.
 */
export const findDebugSource = (node: HTMLElement | SVGElement): DebugSource | undefined => {
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;

  while (current) {
    const fiber = getFiberFromDomNode(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (fiberCursor._debugSource) {
          return fiberCursor._debugSource;
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }
    current = current.parentElement;
  }
  return;
};
