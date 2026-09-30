/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRUNCATION_CLASSES, MAX_TREE_DEPTH } from '../lib/constants';
import { setImportant } from '../lib/dom/set_important';
import { hasComputedTruncation } from './text_layout_helpers';

const EMOTION_TRUNCATION_LABEL_RE = /--(truncatedstyles|textbreakwordstyles|textbreakallstyles)$/i;

const isTruncationClassName = (className: string): boolean => {
  const lower = className.toLowerCase();
  if (TRUNCATION_CLASSES.some((known) => known.toLowerCase() === lower)) return true;
  return EMOTION_TRUNCATION_LABEL_RE.test(className);
};

/**
 * Check whether a single element has text truncation applied — either via
 * a known class name pattern or via computed CSS properties.
 *
 * Class-name detection matches EUI utility classes (`eui-textTruncate`,
 * `eui-textBreakWord`, `eui-textBreakAll`) and Emotion-generated classes
 * whose label contains "truncat" (e.g. `css-xyz-menu_item--truncatedStyles`).
 *
 * When the element is connected to the document, also checks computed
 * styles for `text-overflow: ellipsis` or `-webkit-line-clamp`, which
 * catches truncation applied via arbitrary class names or inline styles.
 *
 * @param el - The DOM element to inspect.
 * @returns `true` when the element has text truncation.
 */
export const isTruncated = (el: Element): boolean => {
  if (Array.from(el.classList).some(isTruncationClassName)) return true;
  if (el.isConnected && el instanceof HTMLElement) {
    if (hasComputedTruncation(el)) return true;
  }
  return false;
};

/**
 * Recursively check whether an element or any of its descendants has
 * truncation applied. Bounded by {@link MAX_TREE_DEPTH} to avoid
 * expensive `getComputedStyle` calls on very deep trees.
 *
 * Used by {@link widenForTruncation} to decide whether the clone needs
 * to be temporarily attached to the DOM for natural-width measurement.
 *
 * @param el - The root DOM element to inspect.
 * @param depth - Current recursion depth (internal).
 * @returns `true` when the element or any descendant has truncation.
 */
export const isTruncatedDeep = (el: Element, depth = 0): boolean => {
  if (depth > MAX_TREE_DEPTH) return false;
  if (isTruncated(el)) return true;
  for (let i = 0; i < el.children.length; i++) {
    if (isTruncatedDeep(el.children[i], depth + 1)) return true;
  }
  return false;
};

/**
 * Strip truncation classes from a clone element and neutralize truncation
 * CSS properties inline.
 *
 * EUI truncation utility classes use `!important` and would override inline
 * dimensions set during cloning. Emotion or arbitrary class names may still
 * apply truncation styles without matching `TRUNCATION_CLASSES`, so this
 * helper also neutralizes known truncation properties inline when truncation
 * is detected on either `clone` or `source`.
 *
 * @param clone - The cloned element to strip truncation classes from.
 * @param source - Optional source element for computed-style truncation checks.
 * @returns `true` when the element has any truncation (EUI or Emotion).
 */
export const stripTruncationClasses = (clone: Element, source?: Element): boolean => {
  let stripped = false;
  for (const cls of Array.from(clone.classList)) {
    if (isTruncationClassName(cls)) {
      clone.classList.remove(cls);
      stripped = true;
    }
  }

  const sourceTruncated = !!source && isTruncated(source);
  const cloneTruncated = isTruncated(clone);
  const hasTruncation = stripped || sourceTruncated || cloneTruncated;
  const computedTruncation =
    source instanceof HTMLElement && source.isConnected ? hasComputedTruncation(source) : false;

  if (hasTruncation && clone instanceof HTMLElement) {
    setImportant(clone, 'text-overflow', 'clip');
    setImportant(clone, '-webkit-line-clamp', 'unset');
    setImportant(clone, 'line-clamp', 'none');
    setImportant(clone, '-webkit-box-orient', 'initial');
    if (computedTruncation || stripped) {
      setImportant(clone, 'overflow', 'visible');
    }
  }

  return hasTruncation;
};
