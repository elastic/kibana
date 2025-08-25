/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode } from './types';
import { getFiberFromDomElement } from './get_fiber_from_dom_element';

/**
 * Find the nearest _debugSource by traversing up the DOM and React Fiber tree.
 * @param {HTMLElement | SVGElement} domElement The DOM element.
 * @return {DebugSource | undefined} The debug source information, or undefined if not found.
 */
export const findDebugSource = (domElement: HTMLElement | SVGElement): DebugSource | undefined => {
  let current: HTMLElement | null =
    domElement instanceof HTMLElement ? domElement : domElement.parentElement;

  while (current) {
    const fiber = getFiberFromDomElement(current);
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
