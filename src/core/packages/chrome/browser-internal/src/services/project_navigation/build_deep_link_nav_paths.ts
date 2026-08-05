/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

/**
 * Builds a map of nav deep-link id → ancestor title chain (including the leaf).
 * First DFS hit wins. Empty titles are skipped. breadcrumbStatus is ignored so
 * search labels can include parents hidden from page breadcrumbs.
 */
export const buildDeepLinkNavPaths = (
  nodes: ChromeProjectNavigationNode[]
): ReadonlyMap<string, readonly string[]> => {
  const paths = new Map<string, readonly string[]>();

  const visit = (node: ChromeProjectNavigationNode, ancestorTitles: readonly string[]): void => {
    const titles = node.title ? [...ancestorTitles, node.title] : [...ancestorTitles];

    if (node.deepLink?.id && !paths.has(node.deepLink.id)) {
      paths.set(node.deepLink.id, titles);
    }

    for (const child of node.children ?? []) {
      visit(child, titles);
    }
  };

  for (const node of nodes) {
    visit(node, []);
  }

  return paths;
};
