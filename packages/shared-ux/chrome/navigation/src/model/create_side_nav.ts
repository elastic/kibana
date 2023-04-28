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
  const { basePath, navigateToUrl } = deps;
  const createSideNavData = (
    parentIds: string | number = '',
    navItems: NavItemProps[],
    platformSectionConfig?: PlatformSectionConfig
  ): Array<EuiSideNavItemType<unknown>> =>
    navItems.reduce<MyEuiSideNavItem[]>((accum, item) => {
      const { id, name, items: subNav, href } = item;
      const config = platformSectionConfig?.properties?.[id];
      if (config?.enabled === false) {
        // return accumulated set without the item that is not enabled
        return accum;
      }

      let onClick: OnClickFn | undefined;

      const fullId = [parentIds, id].filter(Boolean).join('.');

      if (href) {
        onClick = (event: React.MouseEvent) => {
          event.preventDefault();
          navigateToUrl(basePath.prepend(href));
        };
      }

      let filteredSubNav: MyEuiSideNavItem[] | undefined;
      if (subNav) {
        // recursion
        const nextConfig = platformSectionConfig?.properties?.[id];
        filteredSubNav = createSideNavData(fullId, subNav, nextConfig);
      }

      let isSelected: boolean = false;
      let subjId = fullId;
      if (!subNav && fullId === activeNavItemId) {
        // if there are no subnav items and ID is current, mark the item as selected
        isSelected = true;
        subjId += '-selected';
      }

      const next: MyEuiSideNavItem = {
        id: fullId,
        name,
        isSelected,
        onClick,
        href,
        items: filteredSubNav,
        ['data-test-subj']: `nav-item-${subjId}`,
      };
      return [...accum, next];
    }, []);

  return createSideNavData;
};
