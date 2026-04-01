/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from 'unist';
import type { Link, Parent } from 'mdast';

function isParent(node: Node): node is Parent {
  return 'children' in node;
}

function isLink(node: Node): node is Link {
  return node.type === 'link';
}

/**
 * Test if the URL is a bare relative URL that doesn't inherently tell the browser where to go
 */
function isBareRelativeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) return false;
  // Return false if the url starts with a protocol/scheme. Catches http:, https:, mailto:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  return true;
}

/**
 * Resolves bare relative URLs the same way a browser would natively resolve
 * a bare relatve link such as <a href="discover"> against the current page URL.
 */
function resolveAgainstCurrentUrl(url: string): string {
  const resolved = new URL(url, window.location.href);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * This parsing plugin resolves bare relative links and gives them a full URL. The default EUI link validation plugin
 * strips bare relative links, so we want to run this plugin before that happens.
 */
export function resolveRelativeLinksPlugin() {
  return () => {
    const visitor = (node: Node) => {
      if (isLink(node) && isBareRelativeUrl(node.url)) {
        node.url = resolveAgainstCurrentUrl(node.url);
      }
      if (isParent(node)) {
        node.children.forEach(visitor);
      }
    };

    return (tree: Node) => {
      visitor(tree);
    };
  };
}
