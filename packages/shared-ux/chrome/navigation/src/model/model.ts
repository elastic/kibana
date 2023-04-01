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
  PlatformId,
  SolutionProperties,
} from '../../types';
import { LocatorNavigationFn } from '../../types/internal';

/**
 * @internal
 */
export class NavigationModel {
  private common: {
    locatorNavigation: LocatorNavigationFn;
    activeNavItemId?: string;
  };

  constructor(
    locatorNavigation: LocatorNavigationFn,
    activeNavItemId: string | undefined,
    private recentItems: Array<EuiSideNavItemType<unknown>> | undefined,
    private platformConfig: NavigationProps['platformConfig'] | undefined,
    private solutions: SolutionProperties[]
  ) {
    this.common = {
      locatorNavigation,
      activeNavItemId,
    };
  }

  public getRecent(): NavigationBucketProps {
    return {
      id: 'recent',
      icon: 'clock',
      name: 'Recent',
      items: this.recentItems,
      ...this.common,
    };
  }

  public getPlatform(): Record<PlatformId, NavigationBucketProps> {
    return {
      [Platform.Analytics]: {
        id: Platform.Analytics,
        icon: 'stats',
        name: 'Data exploration',
        items: navItemSet[Platform.Analytics],
        platformConfig: this.platformConfig?.[Platform.Analytics],
        ...this.common,
      },
      [Platform.MachineLearning]: {
        id: Platform.MachineLearning,
        icon: 'indexMapping',
        name: 'Machine learning',
        items: navItemSet[Platform.MachineLearning],
        platformConfig: this.platformConfig?.[Platform.MachineLearning],
        ...this.common,
      },
      [Platform.DevTools]: {
        id: Platform.DevTools,
        icon: 'editorCodeBlock',
        name: 'Developer tools',
        items: navItemSet[Platform.DevTools],
        platformConfig: this.platformConfig?.[Platform.DevTools],
        ...this.common,
      },
      [Platform.Management]: {
        id: Platform.Management,
        icon: 'gear',
        name: 'Management',
        items: navItemSet[Platform.Management],
        platformConfig: this.platformConfig?.[Platform.Management],
        ...this.common,
      },
    };
  }

  public getSolutions(): NavigationBucketProps[] {
    // Allow multiple solutions' collapsible nav buckets side-by-side
    return this.solutions.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      items: s.items,
      ...this.common,
    }));
  }

  // public findById(): {}; TODO
}
