/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DefaultRouteHandlerResources,
  ServerRouteHandlerResources,
} from '@kbn/server-route-repository-utils';
import type {
  CreateServerRouteFactory,
  DefaultRouteCreateOptions,
} from '@kbn/server-route-repository-utils/src/typings';

export function createServerRouteFactory<
  TRouteHandlerResources extends ServerRouteHandlerResources = DefaultRouteHandlerResources,
  TRouteCreateOptions extends DefaultRouteCreateOptions | undefined = undefined
>(): CreateServerRouteFactory<TRouteHandlerResources, TRouteCreateOptions> {
  return (route) => ({ [route.endpoint]: route } as any);
}
