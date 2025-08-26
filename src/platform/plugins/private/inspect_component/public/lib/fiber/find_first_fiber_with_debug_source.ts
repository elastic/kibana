/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode, ReactFiberNodeWithDomElement } from './types';
import { getFiberFromDomElement } from './get_fiber_from_dom_element';

const hasDebugSource = (
  fiber: ReactFiberNode
): fiber is ReactFiberNode & { _debugSource: DebugSource } => {
  return fiber._debugSource !== undefined && fiber._debugSource !== null;
};

/**
 * Finds the first React fiber node associated with the given DOM element (or its ancestors)
 * that has a debug source attached to it. It traverses up the DOM tree and for each element,
 * it checks the associated React fiber node and its ancestors for a debug source.
 * @param {HTMLElement} domElement The DOM element.
 * @return {ReactFiberNodeWithDomElement | null} The first fiber node with debug source and its associated DOM element, or null if none found.
 */
export const findFirstFiberWithDebugSource = (
  domElement: HTMLElement
): ReactFiberNodeWithDomElement | null => {
  let current: HTMLElement | null = domElement;

  while (current) {
    const fiber = getFiberFromDomElement(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (hasDebugSource(fiberCursor)) {
          return {
            ...fiberCursor,
            domElement: current,
          };
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }
    current = current.parentElement;
  }
  return null;
};
