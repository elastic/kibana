/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSideNavItemType } from '@elastic/eui';
import { navItemSet, Platform } from '.';
import {
  NavigationBucketProps,
  NavigationProps,
  NavItemProps,
  PlatformId,
  PlatformSectionConfig,
  SolutionProperties,
} from '../../types';
import { LocatorNavigationFn } from '../../types/internal';

type MyEuiSideNavItem = EuiSideNavItemType<unknown>;
type OnClickFn = MyEuiSideNavItem['onClick'];

const createSideNavData = (
  parentIds: string | number = '',
  navItems: NavItemProps[],
  locatorNavigation: LocatorNavigationFn,
  activeNav?: string | number,
  config?: PlatformSectionConfig
): Array<EuiSideNavItemType<unknown>> => {
  return navItems.reduce<MyEuiSideNavItem[]>((accum, item) => {
    const { id, name, items: subNav } = item;
    const matcher = config?.properties?.[id];
    if (matcher?.enabled === false) {
      // return accumulated set without the item that is not enabled
      return accum;
    }

    const fullId = [parentIds, id].filter(Boolean).join('.');

    let onClick: OnClickFn | undefined;
    if (item.locator) {
      // TODO check that the locator instance is valid before rendering the link
      onClick = locatorNavigation({ ...item, id: fullId });
    }

    let filteredSubNav: MyEuiSideNavItem[] | undefined;
    if (subNav) {
      // recursion
      const nextConfig = config?.properties?.[id];
      filteredSubNav = createSideNavData(fullId, subNav, locatorNavigation, activeNav, nextConfig);
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

/**
 * @internal
 */
export class NavigationModel {
  constructor(
    private locatorNavigation: LocatorNavigationFn,
    private activeNavItemId: string,
    private recentItems: Array<EuiSideNavItemType<unknown>> | undefined,
    private platformConfig: NavigationProps['platformConfig'] | undefined,
    private solutions: SolutionProperties[]
  ) {}

  public getRecent(): NavigationBucketProps {
    return {
      id: 'recent',
      icon: 'clock',
      name: 'Recent',
      items: this.recentItems,
    };
  }

  private convertToSideNavItems(
    id: string,
    items: NavItemProps[] | undefined,
    platformConfig?: PlatformSectionConfig
  ) {
    return items
      ? createSideNavData(id, items, this.locatorNavigation, this.activeNavItemId, platformConfig)
      : undefined;
  }

  public getPlatform(): Record<PlatformId, NavigationBucketProps> {
    return {
      [Platform.Analytics]: {
        id: Platform.Analytics,
        icon: 'stats',
        name: 'Data exploration',
        items: this.convertToSideNavItems(
          Platform.Analytics,
          navItemSet[Platform.Analytics],
          this.platformConfig?.[Platform.Analytics]
        ),
        activeNavItemId: this.activeNavItemId,
      },
      [Platform.MachineLearning]: {
        id: Platform.MachineLearning,
        icon: 'indexMapping',
        name: 'Machine learning',
        items: this.convertToSideNavItems(
          Platform.MachineLearning,
          navItemSet[Platform.MachineLearning],
          this.platformConfig?.[Platform.MachineLearning]
        ),
        activeNavItemId: this.activeNavItemId,
      },
      [Platform.DevTools]: {
        id: Platform.DevTools,
        icon: 'editorCodeBlock',
        name: 'Developer tools',
        items: this.convertToSideNavItems(
          Platform.DevTools,
          navItemSet[Platform.DevTools],
          this.platformConfig?.[Platform.DevTools]
        ),
        activeNavItemId: this.activeNavItemId,
      },
      [Platform.Management]: {
        id: Platform.Management,
        icon: 'gear',
        name: 'Management',
        items: this.convertToSideNavItems(
          Platform.Management,
          navItemSet[Platform.Management],
          this.platformConfig?.[Platform.Management]
        ),
        activeNavItemId: this.activeNavItemId,
      },
    };
  }

  public getSolutions(): NavigationBucketProps[] {
    // Allow multiple solutions' collapsible nav buckets side-by-side
    return this.solutions.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      items: this.convertToSideNavItems(s.id, s.items),
      activeNavItemId: this.activeNavItemId,
    }));
  }
}
