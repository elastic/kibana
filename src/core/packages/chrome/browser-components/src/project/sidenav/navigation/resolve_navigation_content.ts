/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
  ProjectNavigationContent,
  ProjectNavigationLinkItem,
  ProjectNavigationLinkListContent,
} from '@kbn/core-chrome-browser';
import type { MenuItem, SecondaryMenuItem } from '@kbn/ui-side-navigation/types';
import { catchError, combineLatest, map, of, startWith, type Observable } from 'rxjs';
import type { NavigationItems } from './to_navigation_items';

export interface ResolvedLinksContent {
  id: string;
  nodeId: string;
  title: string;
  items: SecondaryMenuItem[];
}

const toSecondaryMenuItem = (item: ProjectNavigationLinkItem): SecondaryMenuItem => ({
  id: item.id,
  href: item.href,
  label: item.label,
  badgeType: item.badgeType,
  isExternal: item.isExternal,
});

const walkNodes = (
  nodes: ChromeProjectNavigationNode[] | undefined,
  visit: (node: ChromeProjectNavigationNode) => void
): void => {
  for (const node of nodes ?? []) {
    visit(node);
    walkNodes(node.children, visit);
  }
};

const findMatchingNodeIds = (tree: NavigationTreeDefinitionUI, target: AppDeepLinkId): string[] => {
  const ids = new Set<string>();
  walkNodes([...tree.body, ...(tree.footer ?? [])], (node) => {
    if (node.deepLink?.id === target) {
      ids.add(node.id);
    }
  });
  return [...ids];
};

const isLinkListContent = (
  content: ProjectNavigationContent
): content is ProjectNavigationLinkListContent => content.kind === 'linkList';

export const resolveLinksContent = (
  tree: NavigationTreeDefinitionUI,
  contents: readonly ProjectNavigationContent[]
): Observable<readonly ResolvedLinksContent[]> => {
  if (!tree?.body) {
    return of([]);
  }
  const placements = contents
    .filter(isLinkListContent)
    .flatMap((content) =>
      findMatchingNodeIds(tree, content.target).map((nodeId) => ({ content, nodeId }))
    );

  if (placements.length === 0) {
    return of([]);
  }

  return combineLatest(
    placements.map(({ content, nodeId }) =>
      content.items$.pipe(
        startWith([] as readonly ProjectNavigationLinkItem[]),
        catchError(() => of([] as readonly ProjectNavigationLinkItem[])),
        map((items) => ({
          id: content.id,
          nodeId,
          title: content.title,
          items: items.map(toSecondaryMenuItem),
        }))
      )
    )
  ).pipe(map((resolved) => resolved.filter((section) => section.items.length > 0)));
};

const stripQuery = (url: string): string => url.split('?')[0];

export const findActivePopoverItemId = (
  resolved: readonly ResolvedLinksContent[],
  currentUrl: string
): string | undefined => {
  const current = stripQuery(currentUrl);
  for (const section of resolved) {
    for (const item of section.items) {
      if (stripQuery(item.href) === current) {
        return item.id;
      }
    }
  }
};

export const attachPopoverSections = (
  navigationItems: NavigationItems,
  resolved: readonly ResolvedLinksContent[]
): NavigationItems => {
  if (resolved.length === 0) {
    return navigationItems;
  }

  const byNodeId = new Map(resolved.map((section) => [section.nodeId, section]));

  const attach = (item: MenuItem): MenuItem => {
    const section = byNodeId.get(item.id);
    if (!section || (item.sections?.length ?? 0) > 0) {
      return item;
    }
    return {
      ...item,
      popoverSections: [
        {
          id: section.id,
          label: section.title,
          items: section.items,
        },
      ],
    };
  };

  return {
    ...navigationItems,
    navItems: {
      primaryItems: navigationItems.navItems.primaryItems.map(attach),
      overflowItems: navigationItems.navItems.overflowItems,
      footerItems: navigationItems.navItems.footerItems.map(attach),
    },
  };
};
