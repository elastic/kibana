/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSideNavItemType, IconType } from '@elastic/eui';
import { Observable } from 'rxjs';
import { BasePathService, NavigateToUrlFn, RecentItem } from './internal';

/**
 * A list of services that are consumed by this component.
 * @public
 */
export interface NavigationServices {
  activeNavItemId?: string;
  basePath: BasePathService;
  loadingCount$: Observable<number>;
  recentlyAccessed$: Observable<RecentItem[]>;
  navIsOpen: boolean;
  navigateToUrl: NavigateToUrlFn;
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
    };
    http: {
      basePath: BasePathService;
      getLoadingCount$(): Observable<number>;
    };
  };
}

/**
 * Props for the `NavItem` component representing the content of a navigational item with optional children.
 * @public
 */
export type NavItemProps<T = unknown> = Pick<EuiSideNavItemType<T>, 'id' | 'name'> & {
  /**
   * Nav Items
   */
  items?: Array<NavItemProps<T>>;
  /**
   * Href for a link destination
   * Example: /app/fleet
   */
  href?: string;
};

/**
 * @public
 */
export interface PlatformSectionConfig {
  enabled?: boolean;
  properties?: Record<string, PlatformSectionConfig>;
}

/**
 * @public
 */
export interface SolutionProperties {
  /**
   * Solutions' navigation items
   */
  items?: NavItemProps[];
  /**
   * Solutions' navigation collapsible nav ID
   */
  id: string;
  /**
   * Name to show as title for Solutions' collapsible nav "bucket"
   */
  name: React.ReactNode;
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon: IconType;
}

/**
 * @public
 */
export type PlatformId = 'analytics' | 'ml' | 'devTools' | 'management';

/**
 * Object that will allow parts of the platform-controlled nav to be hidden
 * @public
 */
export type PlatformConfigSet = Record<PlatformId, PlatformSectionConfig>;

/**
 * Props for the `Navigation` component.
 * @public
 */
export interface NavigationProps {
  /**
   * ID of sections to initially open
   * Path to the nav item is given with hierarchy expressed in dotted notation.
   * Example: `my_project.settings.index_management`
   */
  activeNavItemId?: string;
  /**
   * Configuration for Solutions' section(s)
   */
  solutions: SolutionProperties[];
  /**
   * Controls over how Platform nav sections appear
   */
  platformConfig?: Partial<PlatformConfigSet>;
  /**
   * Target for the logo icon
   */
  homeHref: string;
  /**
   * Control of the link that takes the user to their projects or deployments
   */
  linkToCloud?: 'projects' | 'deployments';
}

export type NavigationBucketProps = (SolutionProperties &
  Pick<NavigationProps, 'activeNavItemId'>) & {
  platformConfig?: PlatformSectionConfig;
};
