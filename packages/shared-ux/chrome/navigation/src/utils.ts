/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChromeProjectNavigationNode, NodeDefinition } from '@kbn/core-chrome-browser';

let uniqueId = 0;

function generateUniqueNodeId() {
  const id = `node${uniqueId++}`;
  return id;
}

export function isAbsoluteLink(link: string) {
  return link.startsWith('http://') || link.startsWith('https://');
}

export function nodePathToString<T extends { path?: string[]; id: string } | null>(
  node?: T
): T extends { path?: string[]; id: string } ? string : undefined {
  if (!node) return undefined as T extends { path?: string[]; id: string } ? string : undefined;
  return (node.path ? node.path.join('.') : node.id) as T extends { path?: string[]; id: string }
    ? string
    : undefined;
}

export function isGroupNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children !== undefined;
}

export function isItemNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children === undefined;
}

export function getNavigationNodeId(
  { id: _id, link }: Pick<NodeDefinition, 'id' | 'link'>,
  idGenerator = generateUniqueNodeId
): string {
  const id = _id ?? link;
  return id ?? idGenerator();
}

export function getNavigationNodeHref({
  href,
  deepLink,
}: Pick<ChromeProjectNavigationNode, 'href' | 'deepLink'>): string | undefined {
  return deepLink?.url ?? href;
}
