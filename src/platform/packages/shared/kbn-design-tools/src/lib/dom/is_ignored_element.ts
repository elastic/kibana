/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  IGNORED_SELECTOR,
  IGNORED_ELEMENT_IDS,
  IGNORED_CLASS_LABELS,
  IGNORED_CLASS_PREFIXES,
  DEVTOOL_IGNORE_ATTR,
} from '../constants';

/**
 * Returns true if the element is, is inside, or contains a tool overlay
 * or the developer toolbar - i.e. it should be ignored by measure/edit interactions.
 *
 * Elements can also be ignored by adding the `data-devtool-ignore` attribute.
 *
 * @param el - The element to check.
 * @returns Whether the element should be ignored.
 */
export const isIgnoredElement = (el: Element): boolean => {
  if (IGNORED_ELEMENT_IDS.has(el.id)) return true;
  if (el.hasAttribute(DEVTOOL_IGNORE_ATTR)) return true;
  // className may be an SVGAnimatedString on SVG elements. Guard with typeof check.
  const cls = typeof el.className === 'string' ? el.className : '';
  // Skip EUI components that are purely structural (e.g. spacers)
  if (IGNORED_CLASS_LABELS.some((label) => cls.includes(label))) return true;
  // Skip Kibana chrome layout elements (e.g. kbnChromeLayoutFooter)
  if (IGNORED_CLASS_PREFIXES.some((prefix) => cls.includes(prefix))) return true;
  // Element is inside an ignored container.
  if (el.closest(IGNORED_SELECTOR)) return true;
  // Element contains an ignored container (e.g. footer wrapping the toolbar).
  if (el.querySelector(IGNORED_SELECTOR)) return true;
  return false;
};
