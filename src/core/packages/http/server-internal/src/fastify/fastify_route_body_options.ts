/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouterRoute } from '@kbn/core-http-server';

interface RouteBodyOptions {
  parse?: boolean | 'gunzip';
  output?: string;
  accepts?: string | readonly string[];
}

/** @internal */
export function getMatchedRouteBodyOptions(
  route: RouterRoute | undefined
): RouteBodyOptions | undefined {
  return route?.options?.body as RouteBodyOptions | undefined;
}

/**
 * Hapi returns the raw payload when `parse` is `false` or `gunzip` (Buffer for
 * `output: 'data'`, stream for `output: 'stream'`).
 *
 * @internal
 */
export function routeHasUnparsedPayload(route: RouterRoute | undefined): boolean {
  const parse = getMatchedRouteBodyOptions(route)?.parse;
  return parse === false || parse === 'gunzip';
}

/** @internal */
export function routeWantsStreamPayload(route: RouterRoute | undefined): boolean {
  return getMatchedRouteBodyOptions(route)?.output === 'stream';
}
