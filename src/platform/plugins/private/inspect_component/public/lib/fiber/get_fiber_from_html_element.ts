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
 * Get the {@link ReactFiberNode React Fiber node} associated with a HTML element.
 * @param {HTMLElement | null} element The HTML element to get the {@link ReactFiberNode React Fiber node} from.
 * @returns {ReactFiberNode | null} The corresponding {@link ReactFiberNode React Fiber node}, or null if not found.
 */
export const getFiberFromHtmlElement = (element: HTMLElement | null): ReactFiberNode | null => {
  if (!element) return null;
  const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber$'));
  return fiberKey ? (element as any)[fiberKey] : null;
};
