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
    const scrollReact = scrollIsViewport
      ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
      : scrollContainer.getBoundingClientRect();
    return { targetRect, scrollReact };
  };

  const isVisible = ({ targetRect, scrollReact }: ReturnType<typeof getRects>) =>
    targetRect.top >= scrollReact.top + scrollFixedHeader &&
    targetRect.bottom <= scrollReact.bottom - scrollFixedFooter &&
    targetRect.left >= scrollReact.left &&
    targetRect.right <= scrollReact.right;

  let { targetRect, scrollReact } = getRects();

  if (isVisible({ targetRect, scrollReact })) {
    return;
  }

  // First try native scrollIntoView on the correct container
  target.scrollIntoView();

  if (scrollFixedHeader) {
    // remeasure
    ({ targetRect, scrollReact } = getRects());

    // Now adjust for fixed headers
    const deltaTop = targetRect.top - (scrollReact.top + scrollFixedHeader);
    if (deltaTop < 0) {
      scrollContainer.scrollBy({ top: deltaTop });
    }
  }

  if (scrollFixedFooter) {
    // remeasure again
    ({ targetRect, scrollReact } = getRects());

    // Adjust for fixed footers
    const deltaBottom = targetRect.bottom - (scrollReact.bottom - scrollFixedFooter);
    if (deltaBottom > 0) {
      scrollContainer.scrollBy({ top: deltaBottom });
    }
  }
}
