/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type ReactNode } from 'react';
import type { ChromeProjectNavigationNode, NodeDefinition } from '@kbn/core-chrome-browser';
import { NavigationFooter } from './ui/components/navigation_footer';
import { NavigationGroup } from './ui/components/navigation_group';
import { NavigationItem } from './ui/components/navigation_item';
import { RecentlyAccessed } from './ui/components/recently_accessed';

let uniqueId = 0;

export function generateUniqueNodeId() {
  const id = `node${uniqueId++}`;
  return id;
}

export function isAbsoluteLink(link: string) {
  return link.startsWith('http://') || link.startsWith('https://');
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

function isSamePath(pathA: string | null, pathB: string | null) {
  if (pathA === null || pathB === null) {
    return false;
  }
  return pathA === pathB;
}

export function isActiveFromUrl(nodePath: string, activeNodes: ChromeProjectNavigationNode[][]) {
  return activeNodes.reduce((acc, nodesBranch) => {
    return acc === true ? acc : nodesBranch.some((branch) => isSamePath(branch.path, nodePath));
  }, false);
}

type ChildType = 'item' | 'group' | 'recentlyAccessed' | 'footer' | 'unknown';

export const getChildType = (child: ReactNode): ChildType => {
  if (!React.isValidElement(child)) {
    return 'unknown';
  }

  switch (child.type) {
    case NavigationItem:
      return 'item';
    case NavigationGroup:
      return 'group';
    case RecentlyAccessed:
      return 'recentlyAccessed';
    case NavigationFooter:
      return 'footer';
    default:
      return 'unknown';
  }
};
