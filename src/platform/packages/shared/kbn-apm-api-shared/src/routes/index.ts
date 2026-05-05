/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { barRoute, type BarResponse } from './bar';
import { fooRoute, type FooResponse } from './foo';
import type { RouteEntry } from './types';

export const routeDefinitions = {
  foo: fooRoute,
  bar: barRoute,
};

export type SharedAPMRouteRepository = RouteEntry<typeof fooRoute, FooResponse> &
  RouteEntry<typeof barRoute, BarResponse>;
