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

/**
 * TODO: This logic has been submitted as a pull request to EUI. If https://github.com/elastic/eui/pull/9554 merges,
 * this file and its enclosing folder can be removed
 */

function isParent(node: Node): node is Parent {
  return 'children' in node;
}

function isLink(node: Node): node is Link {
  return node.type === 'link';
}

/**
 * Test if the URL is a document relative URL that doesn't inherently tell the browser where to go
 */
function isDocumentRelativeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) return false;
  // Return false if the url starts with a protocol/scheme. Catches http:, https:, mailto:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  return true;
}

/**
 * Resolves document relative URLs the same way a browser would natively resolve
 * a bare relatve link such as <a href="discover"> against the current page URL.
 */
function resolveAgainstCurrentUrl(url: string): string {
  // Strip trailing slash so that resolution is consistent regardless of
  // whether the current page URL ends with one. Without this,
  // "baz" on "/foo/bar/" resolves to "/foo/bar/baz"
  // instead of the expected "/foo/baz".
  const baseUrl = window.location.href.endsWith('/')
    ? window.location.href.slice(0, -1)
    : window.location.href;
  const resolved = new URL(url, baseUrl);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * This parsing plugin resolves document relative links and gives them a full URL. The default EUI link validation plugin
 * strips document relative links, so we want to run this plugin before that happens.
 */
export function resolveRelativeLinksPlugin() {
  return () => {
    const visitor = (node: Node) => {
      if (isLink(node) && isDocumentRelativeUrl(node.url)) {
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
