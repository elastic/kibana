/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SourceEntry {
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
];

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
 */
export const collectSourceElements = (root: Element): SourceEntry[] => {
  const entries: SourceEntry[] = [];

  // Check root element itself
  const rootMatch = matchSourceAttribute(root);
  if (rootMatch) {
    entries.push({
      element: root,
      attribute: rootMatch.attr,
      value: root.getAttribute(rootMatch.attr) ?? '',
      label: rootMatch.label,
    });
  }

  // Walk descendants in DOM order
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const match = matchSourceAttribute(node as Element);
    if (match) {
      entries.push({
        element: node as Element,
        attribute: match.attr,
        value: (node as Element).getAttribute(match.attr) ?? '',
        label: match.label,
      });
    }
    node = walker.nextNode();
  }

  return entries;
};
