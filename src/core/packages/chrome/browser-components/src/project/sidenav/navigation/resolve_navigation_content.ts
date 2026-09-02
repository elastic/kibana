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
  ProjectNavigationLinkListSection,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import type { MenuItem, SecondaryMenuItem } from '@kbn/ui-side-navigation/types';
import { catchError, combineLatest, map, of, startWith, type Observable } from 'rxjs';
import type { NavigationItems } from './to_navigation_items';

export interface ResolvedLinksContent {
  id: string;
  nodeId: string;
  title: string;
  items: SecondaryMenuItem[];
  viewAll?: {
    href: string;
    label?: string;
  };
}

const toSecondaryMenuItem = (
  sectionId: string,
  item: ProjectNavigationLinkItem
): SecondaryMenuItem => ({
  id: `${sectionId}:${item.id}`,
  href: item.href,
  label: item.label,
  badgeType: item.badgeType,
  isExternal: item.isExternal,
});

const toViewAllItem = (
  nodeId: string,
  viewAll: { href: string; label?: string }
): SecondaryMenuItem => ({
  id: `${nodeId}-viewAll`,
  href: viewAll.href,
  label:
    viewAll.label ??
    i18n.translate('core.ui.chrome.sideNavigation.viewAllLinkText', {
      defaultMessage: 'View all',
    }),
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

export const resolveLinksContent = (
  tree: NavigationTreeDefinitionUI,
  sections: readonly ProjectNavigationLinkListSection[]
): Observable<readonly ResolvedLinksContent[]> => {
  if (!tree?.body) {
    return of([]);
  }
  const placements = sections.flatMap((section) =>
    findMatchingNodeIds(tree, section.target).map((nodeId) => ({ section, nodeId }))
  );

  if (placements.length === 0) {
    return of([]);
  }

  return combineLatest(
    placements.map(({ section, nodeId }) =>
      section.items$.pipe(
        startWith([] as readonly ProjectNavigationLinkItem[]),
        catchError(() => of([] as readonly ProjectNavigationLinkItem[])),
        map((items) => ({
          id: section.id,
          nodeId,
          title: section.title,
          items: items.map((item) => toSecondaryMenuItem(section.id, item)),
          viewAll: section.viewAll,
        }))
      )
    )
  ).pipe(map((resolved) => resolved.filter((resolvedSection) => resolvedSection.items.length > 0)));
};

export const attachPopoverSections = (
  navigationItems: NavigationItems,
  resolved: readonly ResolvedLinksContent[]
): NavigationItems => {
  if (resolved.length === 0) {
    return navigationItems;
  }

  const byNodeId = new Map<string, ResolvedLinksContent[]>();
  for (const section of resolved) {
    const sections = byNodeId.get(section.nodeId);
    if (sections) {
      sections.push(section);
    } else {
      byNodeId.set(section.nodeId, [section]);
    }
  }

  const attach = (item: MenuItem): MenuItem => {
    const sections = byNodeId.get(item.id);
    if (!sections || (item.sections?.length ?? 0) > 0) {
      return item;
    }
    const listSections = sections.map((section) => ({
      id: section.id,
      label: section.title,
      items: section.items,
    }));
    const viewAll = sections.find((section) => section.viewAll)?.viewAll;
    const viewAllSection = viewAll
      ? [
          {
            id: `${item.id}-viewAll`,
            items: [toViewAllItem(item.id, viewAll)],
          },
        ]
      : [];
    return {
      ...item,
      popoverSections: [...listSections, ...viewAllSection],
    };
  };

  return {
    ...navigationItems,
    navItems: {
      primaryItems: navigationItems.navItems.primaryItems.map(attach),
      overflowItems: navigationItems.navItems.overflowItems?.map(attach),
      footerItems: navigationItems.navItems.footerItems.map(attach),
    },
  };
};
