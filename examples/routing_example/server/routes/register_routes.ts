/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { registerGetRandomNumberRoute } from './random_number_generator';
import { registerGetRandomNumberBetweenRoute } from './random_number_between_generator';
import { registerGetMessageByIdRoute, registerPostMessageRoute } from './message_routes';

export function registerRoutes(router: IRouter) {
  registerGetRandomNumberRoute(router);
  registerGetRandomNumberBetweenRoute(router);
  registerGetMessageByIdRoute(router);
  registerPostMessageRoute(router);
}
