/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_LIVE_ATTR } from '../lib/constants';
import { isScreenReaderOnly } from './is_screen_reader_only';

/**
 * Returns the meaningful content root for a managed element.
 *
 * Live elements are wrapped in a container div that holds the `data-devtool-live`
 * attribute. The actual component content is the first child of that
 * wrapper, but some EUI components prepend invisible helper elements (e.g. a
 * screen-reader-only `<p>` in EuiTreeView). Those are skipped in favour of the first
 * visible child.
 *
 * Static clones and regular DOM elements use themselves as the content root.
 *
 * @param target - The element to inspect.
 * @returns The meaningful content root element.
 */
export const getContentRoot = (target: HTMLElement): HTMLElement => {
  if (target.hasAttribute(DEVTOOL_LIVE_ATTR)) {
    for (let i = 0; i < target.children.length; i++) {
      const child = target.children[i] as HTMLElement;
      if (!isHiddenHelper(child)) return child;
    }
    // All children are hidden helpers. Fall back to the first child or target.
    if (target.firstElementChild) return target.firstElementChild as HTMLElement;
  }
  return target;
};

/**
 * Check whether an element is a non-visible helper (screen-reader-only,
 * aria-hidden, or explicitly hidden) that should be skipped when resolving
 * the content root.
 *
 * @param el - The element to check.
 * @returns Whether the element is a hidden helper.
 */
const isHiddenHelper = (el: HTMLElement): boolean => {
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.hasAttribute('hidden')) return true;
  if (isScreenReaderOnly(el)) return true;
  return false;
};

/**
 * Check whether an element is a live React component wrapper.
 *
 * @param target - The element to check.
 * @returns Whether the element has the live component attribute.
 */
export const isLiveElement = (target: HTMLElement): boolean =>
  target.hasAttribute(DEVTOOL_LIVE_ATTR);
