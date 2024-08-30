/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Return focus to the main flyout div to align with a11y standards
 * @param flyoutId ID of the main flyout div element
 */
export const focusMainFlyout = (flyoutId: string) => {
  const flyoutElement = document.getElementById(flyoutId);
  if (flyoutElement) {
    flyoutElement.focus();
  }
};
