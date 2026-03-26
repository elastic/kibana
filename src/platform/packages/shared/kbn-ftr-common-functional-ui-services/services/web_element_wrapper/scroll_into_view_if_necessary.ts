/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function scrollIntoViewIfNecessary(
  target: HTMLElement,
  scrollContainerId?: string,
  scrollFixedHeader: number = 0,
  scrollFixedFooter: number = 0
) {
  const scrollContainer =
    (scrollContainerId && document.getElementById(scrollContainerId)) || document.documentElement;

  // Measure helper, logic is different for scrolling the viewport vs a scroller element
  const getRects = () => {
    const targetRect = target.getBoundingClientRect();
    const scrollIsViewport =
      scrollContainer === document.documentElement || scrollContainer === document.body;
    const scrollRect = scrollIsViewport
      ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
      : scrollContainer.getBoundingClientRect();
    return { targetRect, scrollRect };
  };

  const isVisible = ({ targetRect, scrollRect }: ReturnType<typeof getRects>) =>
    targetRect.top >= scrollRect.top + scrollFixedHeader &&
    targetRect.bottom <= scrollRect.bottom - scrollFixedFooter &&
    targetRect.left >= scrollRect.left &&
    targetRect.right <= scrollRect.right;

  let { targetRect, scrollRect } = getRects();

  if (isVisible({ targetRect, scrollRect })) {
    return;
  }

  // Determine scroll container for adjustments

  // First try native scrollIntoView - it will find and scroll the correct container
  target.scrollIntoView();

  if (scrollFixedHeader) {
    // Remeasure after initial scroll
    ({ targetRect, scrollRect } = getRects());

    // Adjust for fixed headers
    const deltaTop = targetRect.top - (scrollRect.top + scrollFixedHeader);
    if (deltaTop < 0) {
      scrollContainer.scrollBy({ top: deltaTop });
    }
  }

  if (scrollFixedFooter) {
    // Remeasure again after header adjustment
    ({ targetRect, scrollRect } = getRects());

    // Adjust for fixed footers
    const deltaBottom = targetRect.bottom - (scrollRect.bottom - scrollFixedFooter);
    if (deltaBottom > 0) {
      scrollContainer.scrollBy({ top: deltaBottom });
    }
  }
}
