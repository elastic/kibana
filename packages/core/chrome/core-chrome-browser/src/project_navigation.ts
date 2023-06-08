/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';

/** @internal */
type AppId = string;

/** @internal */
type DeepLinkId = string;

/** @internal */
export type AppDeepLinkId = `${AppId}:${DeepLinkId}`;

/** @public */
export type ChromeProjectNavigationLink = AppId | AppDeepLinkId;

/** @public */
export interface ChromeProjectNavigationNode {
  id?: string;
  link?: ChromeProjectNavigationLink;
  children?: ChromeProjectNavigationNode[];
  title?: string;
  icon?: string;
}

/** @public */
export interface ChromeProjectNavigation {
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
