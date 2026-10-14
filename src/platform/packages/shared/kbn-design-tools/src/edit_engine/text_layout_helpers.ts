/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Check whether computed styles force text to stay on a single line.
 *
 * Treats both legacy and modern wrapping controls as no-wrap when present.
 *
 * @param el - Element whose computed text layout styles are inspected.
 * @returns True when text is prevented from wrapping.
 */
export const hasNoWrapTextStyle = (el: HTMLElement): boolean => {
  const computed = getComputedStyle(el);
  const whiteSpace = computed.getPropertyValue('white-space').trim().toLowerCase();
  const textWrap = computed.getPropertyValue('text-wrap').trim().toLowerCase();
  return whiteSpace.includes('nowrap') || whiteSpace === 'pre' || textWrap === 'nowrap';
};

/**
 * Walk up the ancestor chain and check whether any element is no-wrap.
 *
 * The walk starts at `start`, includes `root`, and stops when `root` is
 * reached or `maxDepth` is exceeded.
 *
 * @param start - First element in the ancestor chain to inspect.
 * @param root - Ancestor boundary to include in the check.
 * @param maxDepth - Maximum number of ancestor hops to inspect.
 * @returns True when any inspected element prevents text wrapping.
 */
export const hasNoWrapTextInChain = (
  start: HTMLElement,
  root: HTMLElement,
  maxDepth: number
): boolean => {
  let current: HTMLElement | null = start;
  let depth = 0;
  while (current && depth < maxDepth) {
    if (hasNoWrapTextStyle(current)) return true;
    if (current === root) break;
    current = current.parentElement;
    depth++;
  }
  return false;
};

/**
 * Check whether computed styles indicate text truncation behavior.
 *
 * @param el - Element whose computed truncation styles are inspected.
 * @returns True when ellipsis or line-clamp truncation is detected.
 */
export const hasComputedTruncation = (el: HTMLElement): boolean => {
  const style = getComputedStyle(el);
  if (style.textOverflow === 'ellipsis') return true;
  if (style.webkitLineClamp !== 'none' && style.webkitLineClamp !== '') return true;
  return false;
};
