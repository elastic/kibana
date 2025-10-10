/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromHtmlElement } from './get_fiber_from_html_element';
import type { DebugSource, ReactFiberNode } from './types';

const hasDebugSource = (
  fiber: ReactFiberNode
): fiber is ReactFiberNode & { _debugSource: DebugSource } => {
  return fiber._debugSource !== undefined && fiber._debugSource !== null;
};

/**
 * Finds the first {@link ReactFiberNode React Fiber node} associated with the given HTML element (or its ancestors)
 * that has a {@link DebugSource _debugSource} attached to it.
 * @param {HTMLElement} element The HTML element to start the search from.
 * @return {ReactFiberNode | null} {@link ReactFiberNode React Fiber node}, or null if none found.
 */
export const findFirstFiberWithDebugSource = (element: HTMLElement): ReactFiberNode | null => {
  let current: HTMLElement | null = element;

  while (current) {
    const fiber = getFiberFromHtmlElement(current);
    if (fiber) {
      let fiberCursor: ReactFiberNode | null | undefined = fiber;
      while (fiberCursor) {
        if (hasDebugSource(fiberCursor)) {
          return {
            ...fiberCursor,
            element: current,
          };
        }

        fiberCursor = fiberCursor._debugOwner;
      }
    }
    current = current.parentElement;
  }
  return null;
};
