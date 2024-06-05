/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AddVersionOpts,
  RequestHandler,
  RouteMethod,
  VersionedRouteConfig,
} from '@kbn/core-http-server';

export type Method = Exclude<RouteMethod, 'options'>;

/** @internal */
export interface VersionedRouterRoute {
  method: string;
  path: string;
  options: Omit<VersionedRouteConfig<RouteMethod>, 'path'>;
  handlers: Array<{
    fn: RequestHandler;
    options: AddVersionOpts<unknown, unknown, unknown>;
  }>;
}

/**
 * Specifies resolution strategy to use if a request does not provide a version.
 *
 * This strategy assumes that a handler is represented by a version string [0-9\-]+ that is
 * alphanumerically sortable.
 *
 * @internal
 */
export type HandlerResolutionStrategy =
  /** Use the oldest available version by default */
  | 'oldest'
  /** Use the newest available version by default */
  | 'newest'
  /** Dev-only: remove resolution and fail if no version is provided */
  | 'none';
