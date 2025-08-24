/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactFiberNode } from './types';

/**
 * Get the React Fiber node from a DOM node.
 * @param {HTMLElement|SVGElement|null} node The DOM node.
 * @return {ReactFiberNode|undefined} The React Fiber node associated with the DOM node
 */
export const getFiberFromDomNode = (
  node: HTMLElement | SVGElement | null
): ReactFiberNode | undefined => {
  if (!node) return;
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (node as any)[fiberKey] : undefined;
};
