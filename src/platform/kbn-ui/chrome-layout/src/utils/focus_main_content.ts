/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAIN_CONTENT_SELECTORS } from '../constants';

const focusElement = (element: HTMLElement) => {
  if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
    element.tabIndex = -1;
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
  }

  element.focus();
};

/**
 * Focuses the main content landmark.
 */
export const focusMainContent = () => {
  const mainElement = document.querySelector(MAIN_CONTENT_SELECTORS.join(','));

  if (mainElement instanceof HTMLElement) {
    focusElement(mainElement);
  }
};
