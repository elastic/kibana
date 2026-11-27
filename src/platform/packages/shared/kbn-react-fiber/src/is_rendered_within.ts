/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromElement } from './get_fiber_from_element';

/**
 * Checks whether React rendered the element within the container's subtree. Unlike `Node.contains`
 * this also covers content placed elsewhere in the DOM through portals, e.g. modals and popovers,
 * as their fibers still lead back to the container.
 */
export const isRenderedWithin = (element: Element, container: Element): boolean => {
  if (container.contains(element)) return true;

  let fiber = getFiberFromElement(element);

  while (fiber) {
    if (fiber.stateNode === container) return true;
    fiber = fiber.return ?? null;
  }

  return false;
};
