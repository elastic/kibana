/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSideNavItemType } from '@elastic/eui';
import type { NavigationModelDeps } from '.';
import type { NavItemProps, PlatformSectionConfig } from '../../types';
import type { Locator } from '../../types/internal';

type MyEuiSideNavItem = EuiSideNavItemType<unknown>;
type OnClickFn = MyEuiSideNavItem['onClick'];

/**
 * Factory function to return a function that processes modeled nav items into EuiSideNavItemType
 * The factory puts memoized function arguments in scope for iterations of the recursive item processing.
 */
export const createSideNavDataFactory = (
  deps: NavigationModelDeps,
  activeNavItemId: string | undefined
) => {
  const { basePath, navigateToUrl, getLocator, registerNavItemClick } = deps;
  const createSideNavData = (
    parentIds: string | number = '',
    navItems: NavItemProps[],
    platformSectionConfig?: PlatformSectionConfig
  ): Array<EuiSideNavItemType<unknown>> =>
    navItems.reduce<MyEuiSideNavItem[]>((accum, item) => {
      const { id, name, items: subNav, locator: locatorDefinition, href } = item;
      const config = platformSectionConfig?.properties?.[id];
      if (config?.enabled === false) {
        // return accumulated set without the item that is not enabled
        return accum;
      }

      const { id: locatorId, params: locatorParams } = locatorDefinition ?? {};
      let locator: Locator | undefined;
      if (locatorId) {
        locator = getLocator(locatorId);
      }

      let onClick: OnClickFn | undefined;

      if (locatorId && !locator) {
        // FIXME: we need to return `accum` to skip this link
        // return accum;

        // for DEBUG
        onClick = () => {
          window.alert(
            `Locator not found: ` +
              JSON.stringify({ locatorId, ...(locatorParams ? { locatorParams } : {}) })
          );
        };
      }

      const fullId = [parentIds, id].filter(Boolean).join('.');

      let newHref = href; // allow consumer to pass href, but default to an href formed using the locator
      if (locator) {
        const storedLocator: Locator = locator; // never undefined
        newHref = locator.getRedirectUrl(locatorParams ?? {}); // if consumer passes locator, an href they may have passed gets overwritten
        onClick = (event: React.MouseEvent) => {
          event.preventDefault();
          storedLocator.navigateSync(locatorParams ?? {});
          registerNavItemClick(fullId);
        };
      } else if (href) {
        onClick = (event: React.MouseEvent) => {
          event.preventDefault();
          navigateToUrl(basePath.prepend(href));
          registerNavItemClick(fullId);
        };
      }

      let filteredSubNav: MyEuiSideNavItem[] | undefined;
      if (subNav) {
        // recursion
        const nextConfig = platformSectionConfig?.properties?.[id];
        filteredSubNav = createSideNavData(fullId, subNav, nextConfig);
      }

      let isSelected: boolean = false;
      if (!subNav && fullId === activeNavItemId) {
        // if there are no subnav items and ID is current, mark the item as selected
        isSelected = true;
      }

      const next: MyEuiSideNavItem = {
        id: fullId,
        name,
        isSelected,
        onClick,
        href: newHref,
        items: filteredSubNav,
        ['data-test-subj']: `nav-item-${fullId}`,
      };
      return [...accum, next];
    }, []);

  return createSideNavData;
};
