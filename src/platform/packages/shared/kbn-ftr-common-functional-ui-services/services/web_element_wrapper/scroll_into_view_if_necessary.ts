/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function scrollIntoViewIfNecessary(target: HTMLElement, scrollContainerId?: string) {
  if (!target?.isConnected) return;

  const scroller =
    (scrollContainerId && document.getElementById(scrollContainerId)) || document.documentElement;

  /** Helper: are we looking at viewport or a nested scroller? */
  const isViewport = scroller === document.documentElement || scroller === document.body;

  const getRects = () => {
    const targetRect = target.getBoundingClientRect();
    const scrollRect = isViewport
      ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();
    return { targetRect, scrollRect };
  };

  /* ---------- 1. basic visibility ---------- */
  let { targetRect, scrollRect } = getRects();
  // Co-ordinates relative to the container’s top-left corner
  const relTop = targetRect.top - scrollRect.top;
  const relBottom = targetRect.bottom - scrollRect.top;
  const relLeft = targetRect.left - scrollRect.left;
  const relRight = targetRect.right - scrollRect.left;

  const contHeight = targetRect.bottom - scrollRect.top;
  const contWidth = targetRect.right - scrollRect.left;

  const fullyVisibleVert = relTop >= 0 && relBottom <= contHeight;
  const fullyVisibleHoriz = relLeft >= 0 && relRight <= contWidth;

  if (!fullyVisibleVert || !fullyVisibleHoriz) {
    target.scrollIntoView();
  }

  /* ---------- 2. occlusion check ---------- */
  ({ targetRect, scrollRect } = getRects()); // fresh numbers after scroll
  const points: Array<[number, number]> = [
    [targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2],
    [targetRect.left + 1, targetRect.top + 1],
    [targetRect.right - 1, targetRect.top + 1],
    [targetRect.left + 1, targetRect.bottom - 1],
    [targetRect.right - 1, targetRect.bottom - 1],
  ];

  let coveredAbove = false;
  let coveredBelow = false;

  for (const [x, y] of points) {
    let el = document.elementFromPoint(x, y);
    while (el && getComputedStyle(el).pointerEvents === 'none') el = el.parentElement;
    if (el && el !== target && !target.contains(el)) {
      const br = el.getBoundingClientRect();
      if (br.top <= targetRect.top) coveredAbove = true;
      if (br.bottom >= targetRect.bottom) coveredBelow = true;
      if (coveredAbove && coveredBelow) break;
    }
  }

  /* ---------- 3. nudge ---------- */
  if (coveredAbove || coveredBelow) {
    const vpH = isViewport
      ? window.visualViewport?.height ?? window.innerHeight
      : scroller.clientHeight;

    const extraMargin = 16;

    if (coveredAbove) {
      const offset = targetRect.top - extraMargin;
      scroller.scrollBy({ top: -offset });
    } else if (coveredBelow) {
      const offset = vpH - targetRect.bottom - extraMargin;
      scroller.scrollBy({ top: -offset });
    }
  }
}
