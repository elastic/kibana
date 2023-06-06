/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';
import type { ChromeBreadcrumb } from './breadcrumb';
import type { ChromeNavLink } from './nav_links';

/** @internal */
type AppId = string;

/** @internal */
type DeepLinkId = string;

/** @internal */
export type AppDeepLinkId = `${AppId}:${DeepLinkId}`;

/**
 * @public
 *
 * App id or deeplink id
 */
export type ChromeProjectNavigationLink = AppId | AppDeepLinkId;

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
   * Temporarilly we allow href to be passed.
   * Once all the deeplinks will be exposed in packages we will not allow href anymore
   * and force deeplink id to be passed
   */
  href?: string;
}

/** @public */
export interface ChromeProjectNavigation {
  /**
   * The URL href for the home link
   */
  homeRef: string;
  /**
   * The navigation tree representation of the side bar navigation.
   */
  navigationTree: ChromeProjectNavigationNode[];
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SideNavCompProps {
  // TODO: provide the Chrome state to the component through props
  // e.g. "navTree", "activeRoute", "recentItems"...
}

/** @public */
export type SideNavComponent = ComponentType<SideNavCompProps>;

/** @public */
export type ChromeProjectBreadcrumb = ChromeBreadcrumb;

/** @public */
export interface ChromeSetProjectBreadcrumbsParams {
  absolute: boolean;
}
