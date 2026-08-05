/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeProjectNavigationNode, DeepLinkNavPath } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

const HOME_TITLE = i18n.translate('core.ui.chrome.sideNavigation.homeItemTitle', {
  defaultMessage: 'Home',
});

/**
 * Builds a map of nav deep-link id → {@link DeepLinkNavPath}.
 * First DFS hit wins. Empty titles are skipped. breadcrumbStatus is ignored so
 * search labels can include parents hidden from page breadcrumbs.
 *
 * Icon is the nearest ancestor (including leaf) with an explicit string `icon`
 * (React component icons are skipped). categoryLabel is the nearest panelOpener
 * ancestor title. order is the DFS discovery index among registered deep links.
 *
 * `renderAs: 'home'` is normalized to the shared Home title/icon, matching the
 * sidenav treatment in applyCustomization.
 */
export const buildDeepLinkNavPaths = (
  nodes: ChromeProjectNavigationNode[]
): ReadonlyMap<string, DeepLinkNavPath> => {
  const paths = new Map<string, DeepLinkNavPath>();
  let order = 0;

  const visit = (
    node: ChromeProjectNavigationNode,
    ancestorTitles: readonly string[],
    nearestIcon: string | undefined,
    nearestPanelTitle: string | undefined
  ): void => {
    const isHome = node.renderAs === 'home';
    const nodeTitle = isHome ? HOME_TITLE : node.title;
    const titles = nodeTitle ? [...ancestorTitles, nodeTitle] : [...ancestorTitles];
    const icon = isHome ? 'home' : typeof node.icon === 'string' ? node.icon : nearestIcon;
    const panelTitle =
      node.renderAs === 'panelOpener' && nodeTitle ? nodeTitle : nearestPanelTitle;

    if (node.deepLink?.id && !paths.has(node.deepLink.id)) {
      paths.set(node.deepLink.id, {
        titles,
        order: order++,
        ...(icon !== undefined ? { icon } : {}),
        ...(panelTitle !== undefined ? { categoryLabel: panelTitle } : {}),
      });
    }

    for (const child of node.children ?? []) {
      visit(child, titles, icon, panelTitle);
    }
  };

  for (const node of nodes) {
    visit(node, [], undefined, undefined);
  }

  return paths;
};
