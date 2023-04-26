/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @internal */
type AppId = string;
/** @internal */
type DeepLinkId = string;

/** @internal */
export type AppDeepLinkId = `${AppId}:${DeepLinkId}`; // TODO: should be a union of all deep link ids?

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
