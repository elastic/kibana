/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ServerRoute } from '@kbn/server-route-repository-utils';
import fooRouteDefinition from './foo';
import type { ReturnType } from './foo';

export const routeDefinitions = {
  foo: fooRouteDefinition,
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SharedAPMRouteRepository = {
  [fooRouteDefinition.ENDPOINT]: ServerRoute<
    typeof fooRouteDefinition.ENDPOINT,
    typeof fooRouteDefinition.params,
    any, // handler resources — erased by client extractors
    ReturnType,
    any // route options — erased by client extractors
  >;
};
