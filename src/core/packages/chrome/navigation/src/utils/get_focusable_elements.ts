/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Utility function for getting focusable elements.
 *
 * @param container The container element to search within.
 * @returns An array of focusable elements.
 */
export const getFocusableElements = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('button, a')).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  ) as HTMLElement[];
};
