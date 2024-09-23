/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  RouteInputDeprecation,
  RouteInputDeprecationLocation,
  RouteInputDeprecationDescription,
} from '@kbn/core-http-server';
import { get } from 'lodash';

interface BuilderCommonArgs {
  location: RouteInputDeprecationLocation;
}

export type RouteInputDeprecationInternalDescription = RouteInputDeprecationDescription & {
  message: string;
  check: (v: unknown) => boolean;
};

export const buildRename =
  ({ location }: BuilderCommonArgs) =>
  (oldPath: string, newPath: string) => ({
    type: 'renamed' as const,
    location,
    message: `"${oldPath}" has been removed. Use "${newPath}" instead.`,
    new: newPath,
    old: oldPath,
    check: (input: unknown) => Boolean(get(input, oldPath)),
  });

export const buildRemove =
  ({ location }: BuilderCommonArgs) =>
  (path: string) => ({
    type: 'removed' as const,
    location,
    message: `"${path}" has been removed.`,
    path,
    check: (input: unknown) => Boolean(get(input, path)),
  });

export function buildDeprecations({
  body: bodyFactory,
  query: queryFactory,
}: RouteInputDeprecation): RouteInputDeprecationInternalDescription[] {
  const deprecations: RouteInputDeprecationInternalDescription[] = [];
  for (const [factory, location] of [
    [bodyFactory, 'body'],
    [queryFactory, 'query'],
  ] as const) {
    if (factory) {
      deprecations.push(
        ...(factory({
          rename: buildRename({ location }),
          remove: buildRemove({ location }),
        }) as RouteInputDeprecationInternalDescription[])
      );
    }
  }
  return deprecations;
}
