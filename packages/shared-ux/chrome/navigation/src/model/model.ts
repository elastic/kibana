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
import { GetLocatorFn, ILocatorPublic, NavItemClickFn } from '../../types/internal';

type MyEuiSideNavItem = EuiSideNavItemType<unknown>;
type OnClickFn = MyEuiSideNavItem['onClick'];

/**
 * Factory function to return a function that processes modeled nav items into EuiSideNavItemType
 * The factory puts memoized function arguments in scope for iterations of the recursive item processing.
 */
const createSideNavDataFactory = (
  getLocator: GetLocatorFn,
  registerNavItemClick: NavItemClickFn,
  activeNav?: string | number
) => {
  const createSideNavData = (
    parentIds: string | number = '',
    navItems: NavItemProps[],
    platformSectionConfig?: PlatformSectionConfig
  ): Array<EuiSideNavItemType<unknown>> =>
    navItems.reduce<MyEuiSideNavItem[]>((accum, item) => {
      const { id, name, items: subNav, locator: locatorDefinition } = item;
      const config = platformSectionConfig?.properties?.[id];
      if (config?.enabled === false) {
        // return accumulated set without the item that is not enabled
        return accum;
      }

      const { id: locatorId, params: locatorParams } = locatorDefinition ?? {};
      let locator: ILocatorPublic | undefined;
      if (locatorId) {
        locator = getLocator(locatorId);
      }

      if (locatorId && !locator) {
        // console.warn(`Invalid locator ID provided: ${locatorId}`);
        return accum;
      }

      const fullId = [parentIds, id].filter(Boolean).join('.');

      let onClick: OnClickFn | undefined;
      if (locator && locatorParams) {
        const outerLocator = locator;
        onClick = () => {
          outerLocator.navigateSync(locatorParams ?? {});
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

  return createSideNavData;
};

/**
 * @internal
 */
export class NavigationModel {
  private createSideNavData: (
    parentIds: string | number | undefined,
    navItems: Array<NavItemProps<unknown>>,
    config?: PlatformSectionConfig | undefined
  ) => Array<EuiSideNavItemType<unknown>>;

  constructor(
    getLocator: GetLocatorFn,
    registerNavItemClick: NavItemClickFn,
    private activeNavItemId: string | undefined,
    private recentItems: Array<EuiSideNavItemType<unknown>> | undefined,
    private platformConfig: NavigationProps['platformConfig'] | undefined,
    private solutions: SolutionProperties[]
  ) {
    this.createSideNavData = createSideNavDataFactory(
      getLocator,
      registerNavItemClick,
      activeNavItemId
    );
  }

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
    return items ? this.createSideNavData(id, items, platformConfig) : undefined;
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

  public isEnabled(sectionId: PlatformId) {
    return this.platformConfig?.[sectionId]?.enabled !== false;
  }
}
