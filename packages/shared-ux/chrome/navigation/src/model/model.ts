/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSideNavItemType } from '@elastic/eui';
import type { NavigationModelDeps } from '.';
import { navItemSet, Platform } from '.';
import type {
  NavigationBucketProps,
  NavigationProps,
  NavItemProps,
  PlatformId,
  PlatformSectionConfig,
  SolutionProperties,
} from '../../types';
import { createSideNavDataFactory } from './create_side_nav';

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
    deps: NavigationModelDeps,
    private platformConfig: NavigationProps['platformConfig'] | undefined,
    private solutions: SolutionProperties[],
    activeNavItemId: string | undefined
  ) {
    this.createSideNavData = createSideNavDataFactory(deps, activeNavItemId);
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
    }));
  }

  public isEnabled(sectionId: PlatformId) {
    return this.platformConfig?.[sectionId]?.enabled !== false;
  }
}
