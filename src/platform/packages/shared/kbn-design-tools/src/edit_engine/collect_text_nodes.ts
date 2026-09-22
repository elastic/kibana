/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScreenReaderOnly } from './is_screen_reader_only';

/**
 * Checks whether the element is visually hidden and should be skipped
 * when collecting editable text nodes.
 *
 * @param el - The element to check.
 * @returns Whether the element is hidden.
 */
const isHiddenElement = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.hasAttribute('hidden')) return true;
  const { display, visibility, opacity } = el.style;
  if (display === 'none' || visibility === 'hidden' || opacity === '0') return true;
  if (isScreenReaderOnly(el)) return true;
  // offsetWidth/offsetHeight are 0 for detached elements; skip this check
  // when the element is not connected to the document (e.g. clones).
  if (el.isConnected && el.offsetWidth === 0 && el.offsetHeight === 0) return true;
  return false;
};

/**
 * Recursively collect all non-empty Text nodes within the given element tree,
 * skipping hidden elements, aria-hidden subtrees, and screen-reader-only content.
 *
 * @param el - The root element to collect text nodes from.
 * @returns Array of non-empty Text nodes in DOM order.
 */
export const collectAllTextNodes = (el: Element): Text[] => {
  const nodes: Text[] = [];
  const walk = (node: Node) => {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        nodes.push(child as Text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (!isHiddenElement(child as Element)) {
          walk(child);
        }
      }
    }
  };
  walk(el);
  return nodes;
};
