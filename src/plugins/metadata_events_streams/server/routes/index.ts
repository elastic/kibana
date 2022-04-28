/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup } from '@kbn/core/server';
import { MetadataEventsStreams } from '../services';
import { registerRegisterEventRoute } from './register_event';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  metadataEventsStreams: MetadataEventsStreams;
}

export function registerRoutes({ http, metadataEventsStreams }: RegisterRouteOptions) {
  const router = http.createRouter();

  registerRegisterEventRoute(router, { metadataEventsStreams });
}
