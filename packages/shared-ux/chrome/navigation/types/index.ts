/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { CloudStart } from '@kbn/cloud-plugin/public';

import type {
  ChromeNavLink,
  ChromeProjectNavigation,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';
import type { BasePathService, NavigateToUrlFn, RecentItem } from './internal';
import type { CloudLinks } from '../src/cloud_links';

/**
 * A list of services that are consumed by this component.
 * @public
 */
export interface NavigationServices {
  basePath: BasePathService;
  recentlyAccessed$: Observable<RecentItem[]>;
  navLinks$: Observable<Readonly<ChromeNavLink[]>>;
  navIsOpen: boolean;
  navigateToUrl: NavigateToUrlFn;
  onProjectNavigationChange: (chromeProjectNavigation: ChromeProjectNavigation) => void;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;
  cloudLinks: CloudLinks;
}

/**
 * An interface containing a collection of Kibana dependencies required to
 * render this component
 * @public
 */
export interface NavigationKibanaDependencies {
  core: {
    application: { navigateToUrl: NavigateToUrlFn };
    chrome: {
      recentlyAccessed: { get$: () => Observable<RecentItem[]> };
      navLinks: {
        getNavLinks$: () => Observable<Readonly<ChromeNavLink[]>>;
      };
    };
    http: {
      basePath: BasePathService;
      getLoadingCount$(): Observable<number>;
    };
  };
  serverless: {
    setNavigation: (
      projectNavigation: ChromeProjectNavigation,
      navigationTreeFlattened?: Record<string, ChromeProjectNavigationNode>
    ) => void;
    getActiveNavigationNodes$: () => Observable<ChromeProjectNavigationNode[][]>;
  };
  cloud: CloudStart;
}
