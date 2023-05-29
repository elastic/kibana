/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { BasePathService, NavigateToUrlFn, RecentItem } from './internal';

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

/** @public */
export type ChromeNavigationLink = string;

/**
 * Chrome navigatioin node definition.
 *
 * @public
 */
export interface ChromeNavigationNode {
  /** An optional id. If not provided a link must be passed */
  id?: string;
  /** An optional title for the node */
  title?: string | ReactNode;
  /** An optional eui icon */
  icon?: string;
  /** An app id or a deeplink id */
  link?: ChromeNavigationLink;
  /** Sub navigation item for this node */
  items?: ChromeNavigationNode[];
}

/**
 * Chrome navigation definition used internally in the components.
 * Each "link" (if present) has been converted to a propert href. Additional metadata has been added
 * like the "isActive" flag or the "path" (indicating the full path of the node in the nav tree).
 *
 * @public
 */
export interface ChromeNavigationNodeViewModel extends Omit<ChromeNavigationNode, 'items' | 'id'> {
  id: string;
  /**
   * Full path that points to this node (includes all parent ids). If not set
   * the path is the id
   */
  path?: string;
  isActive?: boolean;
  href?: string;
  items?: ChromeNavigationNodeViewModel[];
}

/**
 * External definition of the side navigation.
 *
 * @public
 */
export interface ChromeNavigation {
  /**
   * Target for the logo icon. Must be an app id or a deeplink id.
   */
  homeLink: ChromeNavigationLink;
  /**
   * Control of the link that takes the user to their projects or deployments
   */
  linkToCloud?: 'projects' | 'deployments';
  /**
   * The navigation tree definition.
   *
   * NOTE: For now this tree will _only_ contain the solution tree and we will concatenate
   * the different platform trees inside the <Navigation /> component.
   * In a following work we will build the full navigation tree inside a "buildNavigationTree()"
   * helper exposed from this package. This helper will allow an array of PlatformId to be disabled
   *
   * e.g. buildNavigationTree({ solutionTree: [...], disable: ['devTools'] })
   */
  navigationTree: ChromeNavigationNode[];
  /**
   * Controls over which Platform nav sections is enabled or disabled.
   * NOTE: this is a temporary solution until we have the buildNavigationTree() helper mentioned
   * above.
   */
  platformConfig?: Partial<PlatformConfigSet>;
  /**
   * Filter function to allow consumer to remove items from the recently accessed section
   */
  recentlyAccessedFilter?: (items: RecentItem[]) => RecentItem[];
}

/**
 * Internal definition of the side navigation.
 *
 * @internal
 */
export interface ChromeNavigationViewModel
  extends Pick<ChromeNavigation, 'linkToCloud' | 'platformConfig' | 'recentlyAccessedFilter'> {
  /**
   * Target for the logo icon
   */
  homeHref: string;
  /**
   * The navigation tree definition
   */
  navigationTree: ChromeNavigationNodeViewModel[];
}

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
export type PlatformId = 'analytics' | 'ml' | 'devTools' | 'management';

/**
 * Object that will allow parts of the platform-controlled nav to be hidden
 * @public
 */
export type PlatformConfigSet = Record<PlatformId, PlatformSectionConfig>;
