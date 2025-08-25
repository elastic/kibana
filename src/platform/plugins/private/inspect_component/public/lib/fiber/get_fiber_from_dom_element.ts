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
 * Get the React Fiber node associated with a DOM element.
 * @param {HTMLElement | SVGElement | null} domElement - The DOM element to get the fiber from.
 * @returns {ReactFiberNode | null} The corresponding React Fiber node, or null if not found.
 */
export const getFiberFromDomElement = (
  domElement: HTMLElement | SVGElement | null
): ReactFiberNode | null => {
  if (!domElement) return null;
  const fiberKey = Object.keys(domElement).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (domElement as any)[fiberKey] : undefined;
};
