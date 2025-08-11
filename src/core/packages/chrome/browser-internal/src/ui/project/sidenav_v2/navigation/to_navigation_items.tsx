/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
  RecentlyAccessedDefinition,
  RootNavigationItemDefinition,
} from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import type {
  MenuItem,
  NavigationStructure,
  SecondaryMenuItem,
  SecondaryMenuSection,
  SideNavLogo,
} from '@kbn/core-chrome-navigation/types';

import { isActiveFromUrl } from '@kbn/shared-ux-chrome-navigation/src/utils';
import { AppDeepLinkIdToIcon } from './hack_icons_mappings';

export interface NavigationItems {
  logoItem: SideNavLogo;
  navItems: NavigationStructure;
  activeItemId?: string;
}

/**
 * Converts the navigation tree definition and nav links into a format for new navigation.
 *
 * @remarks
 *
 * Structural Assumptions and Mapping
 *
 * - Root node (1st level) is used for the "logo" item and application branding
 * - 2nd level nodes are transformed into primary navigation items:
 *   - Accordion nodes are flattened (not supported) - their children become primary items
 *   - Nodes without links that aren't panel openers are treated as section dividers and not supported in new nav - their children are flattened
 *   - panelOpener nodes create flyout secondary navigation panels, they can't have links directly, but can have sections with links
 * - 3rd level is used for secondary navigation (children of panelOpener):
 *   - If all 3rd level items have links, they're treated as menu items and wrapped in a single section
 *   - If some don't have links, they're treated as section headers with their children becoming menu items
 * - Footer is limited to 5 items maximum (extras are dropped with warning)
 *
 * @param navigationTree
 * @param navLinks
 * @param activeNodes
 */
export const toNavigationItems = (
  navigationTree: NavigationTreeDefinitionUI,
  // navLinks and activeNodes are not used yet, but are passed for future use
  // they will be needed for isActive state management and possibly for rendering links
  navLinks: Readonly<ChromeNavLink[]>,
  activeNodes: ChromeProjectNavigationNode[][]
): NavigationItems => {
  // HACK: extract the logo, primary and footer nodes from the navigation tree
  let logoNode: ChromeProjectNavigationNode | null = null;
  let primaryNodes: ChromeProjectNavigationNode[] = [];
  let footerNodes: ChromeProjectNavigationNode[] = [];

  let deepestActiveItemId: string | undefined;
  let currentActiveItemIdLevel = -1;

  const maybeMarkActive = (navNode: ChromeProjectNavigationNode, level: number) => {
    if (deepestActiveItemId == null || currentActiveItemIdLevel < level) {
      if (isActiveFromUrl(navNode.path, activeNodes, false)) {
        deepestActiveItemId = navNode.id;
        currentActiveItemIdLevel = level;
      }
    }
  };

  if (navigationTree.body.length === 1) {
    const firstNode = navigationTree.body[0];
    if (!isRecentlyAccessedDefinition(firstNode)) {
      primaryNodes = firstNode.children ?? [];
      if (primaryNodes[0].renderAs === 'home') {
        logoNode = primaryNodes[0];
        primaryNodes = primaryNodes.slice(1); // Remove the logo node from primary items
        maybeMarkActive(logoNode, 0);
      } else {
        warnOnce(
          `First body node is not a "home" node. It should be a logo node with solution logo, name and home page href. renderAs: "home" is expected, but got "${firstNode.renderAs}".`
        );
      }
    }
  } else {
    warnOnce(
      `Navigation tree body has multiple root nodes. First level should have a single node. It is not used and shall be removed later after we fully migrate to the new nav.`
    );
  }

  if (navigationTree.footer?.length === 1) {
    const firstNode = navigationTree.footer[0];
    if (!isRecentlyAccessedDefinition(firstNode)) {
      footerNodes = firstNode.children ?? [];
    }
  } else {
    warnOnce(
      `Navigation tree footer has multiple root nodes. Footer should have a single node for the footer links.`
    );
  }

  const logoItem: SideNavLogo = {
    href: warnIfMissing(logoNode, 'href', '/missing-href-😭'),
    iconType: warnIfMissing(logoNode, 'icon', 'logoKibana') as string,
    id: warnIfMissing(logoNode, 'id', 'kibana'),
    label: warnIfMissing(logoNode, 'title', 'Kibana'),
  };

  const toMenuItem = (navNode: ChromeProjectNavigationNode): MenuItem[] | MenuItem | null => {
    if (!navNode) return null;

    if (isRecentlyAccessedDefinition(navNode)) {
      warnOnce(
        `Recently accessed node "${navNode.id}" is not supported in the new navigation. Ignoring it.`
      );
      return null;
    }

    if (navNode.sideNavStatus === 'hidden' || navNode.sideNavStatus === 'hiddenV2') {
      return null;
    }

    // Flatten accordion items into a single level with links.
    // This is because the new navigation does not support accordion items.
    if (navNode.renderAs === 'accordion') {
      if (!navNode.children?.length) {
        warnOnce(`Accordion node "${navNode.id}" has no children. Ignoring it.`);
        return null;
      }

      const items = filterEmpty(navNode.children.flatMap(toMenuItem));

      warnOnce(
        `Accordion items are not supported in the new navigation. Flattening them "${items
          .map((i) => i.id)
          .join(', ')}" and dropping accordion node "${navNode.id}".`
      );

      return items;
    }

    // This was like a sub-section title without a link in the old navigation.
    // In the new navigation, just flatten it into its children, since we must have links in the primary items.
    if (navNode.renderAs !== 'panelOpener' && !navNode.href) {
      warnOnce(
        `Navigation node "${navNode.id}${
          navNode.title ? ` (${navNode.title})` : ''
        }" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: ${navNode.children
          ?.map((c) => c.id)
          .join(', ')}.`
      );

      if (!navNode.children?.length) return null;
      return filterEmpty(navNode.children.flatMap(toMenuItem));
    }

    let secondarySections: SecondaryMenuSection[] | undefined;
    if (navNode.renderAs === 'panelOpener') {
      if (!navNode.children?.length) {
        warnOnce(`Panel opener node "${navNode.id}" has no children. Ignoring it.`);
        return null;
      }

      const noSubSections = navNode.children.every((l) => l.href);

      if (noSubSections) {
        warnOnce(
          `Panel opener node "${
            navNode.id
          }" should contain panel sections, not direct links. Flattening links "${navNode.children
            ?.map((c) => c.id)
            .join(', ')}" into secondary items and creating a placeholder section for these links.`
        );

        // If all children have hrefs, we can treat them as secondary items
        secondarySections = [
          // create a single section for all children
          {
            id: `${navNode.id}-section`,
            label: null,
            items: navNode.children.map((child) => {
              warnUnsupportedNavNodeOptions(child);
              maybeMarkActive(child, 2);
              return {
                id: child.id,
                label: warnIfMissing(child, 'title', 'Missing Title 😭'),
                href: warnIfMissing(child, 'href', 'Missing Href 😭'),
                external: child.isExternalLink,
                iconType: child.icon,
                'data-test-subj': getTestSubj(child),
              };
            }),
          },
        ];
      } else {
        // Otherwise, we need to create sections for each child
        secondarySections = filterEmpty(
          navNode.children.map((child) => {
            if (child.sideNavStatus === 'hidden' || child.sideNavStatus === 'hiddenV2') return null;
            if (!child.children?.length) return null;

            warnUnsupportedNavNodeOptions(child);

            const secondaryItems: SecondaryMenuItem[] =
              child.children
                .filter(
                  (subChild) =>
                    subChild.sideNavStatus !== 'hidden' && subChild.sideNavStatus !== 'hiddenV2'
                )
                .map((subChild) => {
                  warnUnsupportedNavNodeOptions(subChild);
                  maybeMarkActive(subChild, 2);
                  return {
                    id: subChild.id,
                    label: warnIfMissing(subChild, 'title', 'Missing Title 😭'),
                    href: warnIfMissing(subChild, 'href', 'Missing Href 😭'),
                    external: subChild.isExternalLink,
                    'data-test-subj': getTestSubj(subChild),
                  };
                }) ?? [];

            if (child.href) {
              warnOnce(
                `Secondary menu item node "${child.id}" has a href "${child.href}", but it should not. We're using it as a section title that doesn't have a link.`
              );
            }

            return {
              id: child.id,
              label: child.title ?? null, // Use null for no label
              items: secondaryItems,
            };
          })
        );
      }
    }

    warnUnsupportedNavNodeOptions(navNode);

    // for primary menu items there should always be a href
    // if it's a panel opener, we use the first link inside the section as the href
    // if there are no sections, we use the href directly
    let itemHref: string;
    if (secondarySections?.length) {
      // If this is a panel opener, we don't use href directly, but rather the find first link inside section
      const firstSectionWithItems = secondarySections.find((section) => section.items.length > 0);
      const firstItemWithHref = firstSectionWithItems?.items.find((item) => item.href);
      itemHref = warnIfMissing(firstItemWithHref, 'href', 'missing-href-😭');

      if (navNode.href) {
        warnOnce(
          `Panel opener node "${navNode.id}" has a href "${navNode.href}", but it should not. We're using it as a panel opener that contains sections with links and we use the first link inside the section as the href ${itemHref}.`
        );
      }
    } else {
      itemHref = warnIfMissing(navNode, 'href', 'missing-href-😭');
    }

    maybeMarkActive(navNode, 1);

    return {
      id: navNode.id,
      label: warnIfMissing(navNode, 'title', 'Missing Title 😭'),
      iconType: warnIfMissing(navNode, 'icon', AppDeepLinkIdToIcon[navNode.id] || 'broom'),
      href: itemHref,
      sections: secondarySections,
      'data-test-subj': getTestSubj(navNode),
    };
  };

  const primaryItems = filterEmpty(primaryNodes.flatMap(toMenuItem));

  const footerItems = filterEmpty(footerNodes.flatMap(toMenuItem));

  if (footerItems.length > 5) {
    warnOnce(
      `Footer items should not exceed 5. Found ${
        footerItems.length
      }. Only the first 5 will be displayed. Dropped items: ${footerItems
        .slice(5)
        .map((item) => item.id)
        .join(', ')}`
    );
  }

  return { logoItem, navItems: { primaryItems, footerItems }, activeItemId: deepestActiveItemId };
};

// =====================
// Utilities & Helpers
// =====================

function warnIfMissing<T extends { id: string }, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback: NonNullable<T[K]>
): NonNullable<T[K]> {
  if (!obj) {
    warnOnce(
      `Navigation item is missing. Using fallback value: "${String(fallback)}" for key "${String(
        key
      )}".`
    );
    return fallback;
  }

  const value = obj[key];
  if (value === undefined || value === null) {
    warnOnce(
      `Navigation item "${String(obj?.id)}" is missing a "${String(
        key
      )}". Using fallback value: "${String(fallback)}".`
    );

    return fallback;
  }
  return value as NonNullable<T[K]>;
}

const warnedMessages = new Set<string>();
let lastWarning = '';
function warnOnce(message: string) {
  if (!warnedMessages.has(message)) {
    warnedMessages.add(message);
  }
  setTimeout(() => {
    const header = '\n=== Navigation Warnings ===\n';
    const warning =
      header +
      Array.from(warnedMessages.values())
        .map((msg) => `• ${msg}`)
        .join('\n');
    if (warning !== lastWarning) {
      // eslint-disable-next-line no-console
      console.warn(warning);
      lastWarning = warning;
    }
  }, 0);
}

function warnUnsupportedNavNodeOptions(navNode: ChromeProjectNavigationNode) {
  if (navNode.spaceBefore) {
    warnOnce(
      `Space before is not supported in the new navigation. Ignoring it for node "${navNode.id}".`
    );
  }

  if (navNode.badgeOptions || navNode.withBadge) {
    warnOnce(
      `Badge options are not supported in the new navigation. Ignoring them for node "${navNode.id}".`
    );
  }

  if (navNode.openInNewTab) {
    warnOnce(
      `Open in new tab is not supported in the new navigation. Ignoring it for node "${navNode.id}".`
    );
  }

  if (navNode.renderItem) {
    warnOnce(
      `Custom renderItem is not supported in the new navigation. Ignoring it for node "${navNode.id}".`
    );
  }
}

const isRecentlyAccessedDefinition = (
  item: ChromeProjectNavigationNode | RecentlyAccessedDefinition
): item is RecentlyAccessedDefinition => {
  return (item as RootNavigationItemDefinition).type === 'recentlyAccessed';
};

const filterEmpty = <T,>(arr: Array<T | null | undefined>): T[] =>
  arr.filter((item) => item !== null && item !== undefined) as T[];

const getTestSubj = (navNode: ChromeProjectNavigationNode, isActive = false): string => {
  const { id, path, deepLink } = navNode;
  return classnames(`nav-item`, `nav-item-${path}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });
};
