/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identifyIconType } from '../components/edit/library/eui_icon_cache';

interface SourceEntry {
  element: Element;
  attribute: string;
  value: string;
  label: string;
}

const SOURCE_ATTRIBUTES: Array<{ selector: string; attr: string; label: string }> = [
  { selector: 'img[src]', attr: 'src', label: 'img' },
  { selector: 'video[src]', attr: 'src', label: 'video' },
  { selector: 'source[src]', attr: 'src', label: 'source' },
  { selector: 'iframe[src]', attr: 'src', label: 'iframe' },
  { selector: 'image[href]', attr: 'href', label: 'svg image' },
  { selector: 'use[href]', attr: 'href', label: 'svg use' },
  { selector: '[data-icon-type]', attr: 'data-icon-type', label: 'icon' },
  // Fallback: EUI icon SVGs that lack the data-icon-type attribute (e.g. live elements)
  { selector: 'svg.euiIcon:not([data-icon-type])', attr: 'data-icon-type', label: 'icon' },
];

/** Whether a matched entry needs async icon-type identification. */
const needsIdentification = (el: Element, attr: string): boolean =>
  attr === 'data-icon-type' && !el.hasAttribute('data-icon-type');

const matchSourceAttribute = (el: Element): { attr: string; label: string } | undefined => {
  for (const { selector, attr, label } of SOURCE_ATTRIBUTES) {
    if (el.matches(selector)) {
      return { attr, label };
    }
  }
  return undefined;
};

/**
 * Collect all elements with source-like attributes (src, href) within the
 * given element tree in DOM order, including the root element itself.
 *
 * For EUI icon SVGs without `data-icon-type`, the icon type is identified
 * asynchronously by matching path data against known icons.
 *
 * @param root - The root element to collect media from.
 * @returns Array of source entries with attribute and element references.
 */
export const collectMediaElements = async (root: Element): Promise<SourceEntry[]> => {
  const entries: SourceEntry[] = [];
  const pendingIdentifications: Array<{ entry: SourceEntry; element: Element }> = [];

  const addEntry = (el: Element, match: { attr: string; label: string }) => {
    const entry: SourceEntry = {
      element: el,
      attribute: match.attr,
      value: el.getAttribute(match.attr) ?? '',
      label: match.label,
    };
    entries.push(entry);
    if (needsIdentification(el, match.attr)) {
      pendingIdentifications.push({ entry, element: el });
    }
  };

  // Check root element itself
  const rootMatch = matchSourceAttribute(root);
  if (rootMatch) {
    addEntry(root, rootMatch);
  }

  // Walk descendants in DOM order
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const match = matchSourceAttribute(node as Element);
    if (match) {
      addEntry(node as Element, match);
    }
    node = walker.nextNode();
  }

  // Resolve icon types for SVGs that lacked data-icon-type
  if (pendingIdentifications.length > 0) {
    const results = await Promise.all(
      pendingIdentifications.map(({ element }) => identifyIconType(element))
    );
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        pendingIdentifications[i].entry.value = results[i];
        pendingIdentifications[i].element.setAttribute('data-icon-type', results[i]);
      }
    }
  }

  return entries;
};
