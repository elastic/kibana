/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Default selectors matching Kibana's constants for backward compatibility
const DEFAULT_MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '#app-content'];

/**
 * Utility function for focusing the main content area.
 * @param selectors - CSS selectors for the main content area.
 *                   Defaults to ['main', '[role="main"]', '#app-content'] if not provided.
 */
export const focusMainContent = (selectors: string[] = DEFAULT_MAIN_CONTENT_SELECTORS) => {
  const mainElement = document.querySelector(selectors.join(','));

  if (mainElement instanceof HTMLElement) {
    mainElement.focus();
  }
};
