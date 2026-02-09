/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_MARGIN_BOTTOM = 32;

// Calculates the available height for content within a flyout tab
export function getTabContentAvailableHeight(
  elementRef: HTMLElement | null,
  decreaseAvailableHeightBy: number
): number {
  if (!elementRef) {
    return 0;
  }

  const position = elementRef.getBoundingClientRect();
  return window.innerHeight - position.top - decreaseAvailableHeightBy;
}

// Calculates the height for a flyout content area
export function calculateFlyoutContentHeight(
  containerRef: HTMLElement | null,
  marginBottom: number = DEFAULT_MARGIN_BOTTOM
): number {
  if (!containerRef) {
    return 0;
  }

  // Find the flyout footer to account for its height
  const flyoutFooter = containerRef.closest('.euiFlyout')?.querySelector('.euiFlyoutFooter');
  const footerHeight = flyoutFooter ? flyoutFooter.getBoundingClientRect().height : 0;

  return getTabContentAvailableHeight(containerRef, marginBottom + footerHeight);
}

