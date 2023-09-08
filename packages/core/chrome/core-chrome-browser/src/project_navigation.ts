/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ComponentType } from 'react';
import type { Location } from 'history';
import type { AppId as DevToolsApp, DeepLinkId as DevToolsLink } from '@kbn/deeplinks-devtools';
import type {
  AppId as AnalyticsApp,
  DeepLinkId as AnalyticsDeepLink,
} from '@kbn/deeplinks-analytics';
import type { AppId as MlApp, DeepLinkId as MlLink } from '@kbn/deeplinks-ml';
import type {
  AppId as ManagementApp,
  DeepLinkId as ManagementLink,
} from '@kbn/deeplinks-management';
import type { AppId as SearchApp, DeepLinkId as SearchLink } from '@kbn/deeplinks-search';
import type {
  AppId as ObservabilityApp,
  DeepLinkId as ObservabilityLink,
} from '@kbn/deeplinks-observability';

import type { ChromeBreadcrumb } from './breadcrumb';
import type { ChromeNavLink } from './nav_links';

/** @public */
export type AppId =
  | DevToolsApp
  | AnalyticsApp
  | MlApp
  | ManagementApp
  | SearchApp
  | ObservabilityApp;

/** @public */
export type AppDeepLinkId =
  | AnalyticsDeepLink
  | DevToolsLink
  | MlLink
  | ManagementLink
  | SearchLink
  | ObservabilityLink;

/** @public */
export type CloudLinkId = 'userAndRoles' | 'performance' | 'billingAndSub' | 'deployment';

export type GetIsActiveFn = (params: {
  /** The current path name including the basePath + hash value but **without** any query params */
  pathNameSerialized: string;
  /** The history Location */
  location: Location;
  /** Utiliy function to prepend a path with the basePath */
  prepend: (path: string) => string;
}) => boolean;

/** @public */
export interface ChromeProjectNavigationNode {
  /** Optional id, if not passed a "link" must be provided. */
  id: string;
  /** Optional title. If not provided and a "link" is provided the title will be the Deep link title */
  title: string;
  /** Path in the tree of the node */
  path: string[];
  /** App id or deeplink id */
  deepLink?: ChromeNavLink;
  /** Optional icon for the navigation node. Note: not all navigation depth will render the icon */
  icon?: string;
  /** Optional children of the navigation node */
  children?: ChromeProjectNavigationNode[];
  /**
   * href for absolute links only. Internal links should use "link".
   */
  href?: string;
  /**
   * Flag to indicate if the node is currently active.
   */
  isActive?: boolean;
  /**
   * Optional function to get the active state. This function is called whenever the location changes.
   */
  getIsActive?: GetIsActiveFn;

  /**
   * Optional flag to indicate if the breadcrumb should be hidden when this node is active.
   * @default 'visible'
   */
  breadcrumbStatus?: 'hidden' | 'visible';
}

/** @public */
export interface ChromeProjectNavigation {
  /**
   * The navigation tree representation of the side bar navigation.
   */
  navigationTree: ChromeProjectNavigationNode[];
}

/** @public */
export interface SideNavCompProps {
  activeNodes: ChromeProjectNavigationNode[][];
}

/** @public */
export type SideNavComponent = ComponentType<SideNavCompProps>;

/** @public */
export type ChromeProjectBreadcrumb = ChromeBreadcrumb;

/** @public */
export interface ChromeSetProjectBreadcrumbsParams {
  absolute: boolean;
}

type NonEmptyArray<T> = [T, ...T[]];

/**
 * @public
 *
 * A navigation node definition with its unique id, title, path in the tree and optional
 * deep link and children.
 * This definition serves to build the full ChromeProjectNavigation.navigationTree, converting
 * "link" to "deepLink" and adding the "path" property for each node.
 */
export interface NodeDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> {
  /** Optional id, if not passed a "link" must be provided. */
  id?: Id;
  /** Optional title. If not provided and a "link" is provided the title will be the Deep link title */
  title?: string;
  /** App id or deeplink id */
  link?: LinkId;
  /** Cloud link id */
  cloudLink?: CloudLinkId;
  /** Optional icon for the navigation node. Note: not all navigation depth will render the icon */
  icon?: string;
  /** Optional children of the navigation node */
  children?: NonEmptyArray<NodeDefinition<LinkId, Id, ChildrenId>>;
  /**
   * Use href for absolute links only. Internal links should use "link".
   */
  href?: string;
  /**
   * Optional function to get the active state. This function is called whenever the location changes.
   */
  getIsActive?: GetIsActiveFn;

  /**
   * Optional flag to indicate if the breadcrumb should be hidden when this node is active.
   * @default 'visible'
   */
  breadcrumbStatus?: 'hidden' | 'visible';
}

/**
 * @public
 *
 * A navigation node definition with its unique id, title, path in the tree and optional
 * deep link and children.
 */
export type NodeDefinitionWithChildren<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenID extends string = Id
> = NodeDefinition<LinkId, Id, ChildrenID> & {
  children: Required<NodeDefinition<LinkId, Id, ChildrenID>>['children'];
};
