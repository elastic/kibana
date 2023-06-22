/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { navItemSet, Platform } from '.';
import type { ChromeNavigationNodeViewModel, PlatformId, PlatformConfigSet } from '../../types';
import { parseNavItems } from './create_side_nav';

/**
 * @internal
 */
export class NavigationModel {
  constructor(
    private platformConfig: Partial<PlatformConfigSet> | undefined,
    private solutions: ChromeNavigationNodeViewModel[]
  ) {}

  public getPlatform(): Record<PlatformId, ChromeNavigationNodeViewModel> {
    return {
      [Platform.Analytics]: {
        id: Platform.Analytics,
        icon: 'stats',
        title: 'Data exploration',
        items: parseNavItems(
          [Platform.Analytics],
          navItemSet[Platform.Analytics],
          this.platformConfig?.[Platform.Analytics]
        ),
      },
      [Platform.MachineLearning]: {
        id: Platform.MachineLearning,
        icon: 'indexMapping',
        title: 'Machine learning',
        items: parseNavItems(
          [Platform.MachineLearning],
          navItemSet[Platform.MachineLearning],
          this.platformConfig?.[Platform.MachineLearning]
        ),
      },
      [Platform.DevTools]: {
        id: Platform.DevTools,
        icon: 'editorCodeBlock',
        title: 'Developer tools',
        items: parseNavItems(
          [Platform.DevTools],
          navItemSet[Platform.DevTools],
          this.platformConfig?.[Platform.DevTools]
        ),
      },
      [Platform.Management]: {
        id: Platform.Management,
        icon: 'gear',
        title: 'Management',
        items: parseNavItems(
          [Platform.Management],
          navItemSet[Platform.Management],
          this.platformConfig?.[Platform.Management]
        ),
      },
    };
  }

  public getSolutions(): ChromeNavigationNodeViewModel[] {
    // Allow multiple solutions' collapsible nav buckets side-by-side
    return this.solutions.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      items: parseNavItems([s.id], s.items),
    }));
  }

  public isEnabled(sectionId: PlatformId) {
    return this.platformConfig?.[sectionId]?.enabled !== false;
  }
}
