/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSideNavItemType } from '@elastic/eui';
import { NavItemProps, PlatformSectionConfig } from '../types';
import { GetLocatorFn, LocatorNavigationFn, SetActiveNavItemIdFn } from '../types/internal';

export const getLocatorNavigation = (
  getLocator: GetLocatorFn,
  setActiveNavItemId: SetActiveNavItemIdFn
): LocatorNavigationFn => {
  const locatorNavigation = (item: NavItemProps | undefined) => () => {
    if (item) {
      const { locator, id } = item;
      setActiveNavItemId(id);
      if (locator) {
        const locatorInstance = getLocator(locator.id);

        if (!locatorInstance) {
          throw new Error(`Unresolved Locator instance for ${locator.id}`);
        }

        locatorInstance.navigateSync(locator.params ?? {});
      }
    }
  };
  return locatorNavigation;
};

type MyEuiSideNavItem = EuiSideNavItemType<unknown>;
type OnClickFn = MyEuiSideNavItem['onClick'];

export const convertNavItemsToEui = (
  navItems: NavItemProps[],
  locatorNavigation: LocatorNavigationFn,
  config?: PlatformSectionConfig,
  activeNav?: string,
  parentNavPath: string | number = ''
): Array<EuiSideNavItemType<unknown>> => {
  return navItems.reduce<MyEuiSideNavItem[]>((accum, item) => {
    const { id, name, items: subNav } = item;
    const matcher = config?.properties?.[id];
    if (matcher?.enabled === false) {
      // return accumulated set without the item that is not enabled
      return accum;
    }

    const fullId = [parentNavPath, id].filter(Boolean).join('.');

    let onClick: OnClickFn | undefined;
    if (item.locator) {
      onClick = locatorNavigation({ ...item, id: fullId });
    }

    let filteredSubNav: NavItemProps[] | undefined;
    if (subNav) {
      // recursion
      const nextConfig = config?.properties?.[id];
      filteredSubNav = convertNavItemsToEui(
        subNav,
        locatorNavigation,
        nextConfig,
        activeNav,
        fullId
      );
    }

    let isSelected: boolean = false;
    if (!subNav && fullId === activeNav) {
      // if there are no subnav items and ID is current, mark the item as selected
      isSelected = true;
    }

    const next: MyEuiSideNavItem = {
      id: fullId,
      name,
      isSelected,
      onClick,
      items: filteredSubNav,
      ['data-test-subj']: `nav-item-${fullId}`,
    };
    return [...accum, next];
  }, []);
};
