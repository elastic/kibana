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
  ProjectNavigationLinkItem,
  ProjectNavigationLinkList,
  ProjectNavigationLinks,
} from '@kbn/core-chrome-browser';
import type { MenuItem, SecondaryMenuItem } from '@kbn/ui-side-navigation/types';
import { catchError, combineLatest, map, of, startWith, type Observable } from 'rxjs';
import type { NavigationItems } from './to_navigation_items';

export interface ResolvedLinkList {
  id: string;
  title: string;
  items: SecondaryMenuItem[];
}

export interface ResolvedLinksPlacement {
  nodeId: string;
  lists: ResolvedLinkList[];
}

const toSecondaryMenuItem = (
  listId: string,
  item: ProjectNavigationLinkItem
): SecondaryMenuItem => ({
  id: `${listId}:${item.id}`,
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

const resolveList = (list: ProjectNavigationLinkList): Observable<ResolvedLinkList> =>
  list.items$.pipe(
    startWith([] as readonly ProjectNavigationLinkItem[]),
    catchError(() => of([] as readonly ProjectNavigationLinkItem[])),
    map((items) => ({
      id: list.id,
      title: list.title,
      items: items.map((item) => toSecondaryMenuItem(list.id, item)),
    }))
  );

const resolvePlacement = (
  registration: ProjectNavigationLinks,
  nodeId: string
): Observable<ResolvedLinksPlacement> => {
  if (registration.lists.length === 0) {
    return of({ nodeId, lists: [] });
  }

  return combineLatest(registration.lists.map(resolveList)).pipe(
    map((lists) => ({
      nodeId,
      lists: lists.filter((list) => list.items.length > 0),
    }))
  );
};

export const resolveLinksContent = (
  tree: NavigationTreeDefinitionUI,
  registrations: readonly ProjectNavigationLinks[]
): Observable<readonly ResolvedLinksPlacement[]> => {
  if (!tree?.body) {
    return of([]);
  }
  const placements = registrations.flatMap((registration) =>
    findMatchingNodeIds(tree, registration.target).map((nodeId) => ({ registration, nodeId }))
  );

  if (placements.length === 0) {
    return of([]);
  }

  return combineLatest(
    placements.map(({ registration, nodeId }) => resolvePlacement(registration, nodeId))
  ).pipe(map((resolved) => resolved.filter((placement) => placement.lists.length > 0)));
};

export const attachPopoverSections = (
  navigationItems: NavigationItems,
  resolved: readonly ResolvedLinksPlacement[]
): NavigationItems => {
  if (resolved.length === 0) {
    return navigationItems;
  }

  const byNodeId = new Map<string, ResolvedLinksPlacement>();
  for (const placement of resolved) {
    byNodeId.set(placement.nodeId, placement);
  }

  const attach = (item: MenuItem): MenuItem => {
    const placement = byNodeId.get(item.id);
    // v1 skips nodes that already have `sections`. Intended later: tree children, then lists, then footer.
    if (!placement || (item.sections?.length ?? 0) > 0) {
      return item;
    }
    return {
      ...item,
      popoverSections: placement.lists.map((list) => ({
        id: list.id,
        label: list.title,
        items: list.items,
      })),
    };
  };

  return {
    ...navigationItems,
    navItems: {
      primaryItems: navigationItems.navItems.primaryItems.map(attach),
      // More stays a flat link. popoverSections would turn the parent into a submenu.
      overflowItems: navigationItems.navItems.overflowItems,
      footerItems: navigationItems.navItems.footerItems.map(attach),
    },
  };
};
