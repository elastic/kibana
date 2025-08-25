/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromDomElement } from './get_fiber_from_dom_element';
import type { ReactFiberNode } from './types';

/**
 * Traverses up the React Fiber tree from the given DOM element to locate the
 * DOM element that corresponds to a JSX element defined in a user-created
 * (composite) React component.
 * @param domElement - The starting DOM element.
 * @returns The DOM element associated with the user-defined component's JSX element, or null if not found.
 */
export const findDomElementForUserComponent = (
  domElement: HTMLElement | SVGElement
): HTMLElement | null => {
  if (!domElement) return null;

  const getFirstHostDom = (fiber: ReactFiberNode | null): HTMLElement | null => {
    if (!fiber) return null;

    if (fiber.stateNode instanceof HTMLElement) {
      return fiber.stateNode;
    }
    let child = fiber.child;
    while (child) {
      const dom = getFirstHostDom(child);
      if (dom) return dom;
      child = child.sibling;
    }

    return null;
  };

  const fiber = getFiberFromDomElement(domElement);
  let current: ReactFiberNode | null = fiber;

  // Walk up the fiber tree until we find a composite component
  while (current) {
    const isComposite = !(current.stateNode instanceof HTMLElement);
    if (isComposite && current._debugSource) {
      return getFirstHostDom(current);
    }
    current = current.return ?? null;
  }

  return null;
};
