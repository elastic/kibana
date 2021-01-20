/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CapabilitiesResolver } from '../resolve_capabilities';
import { InternalHttpServiceSetup } from '../../http';
import { registerCapabilitiesRoutes } from './resolve_capabilities';

export function registerRoutes(http: InternalHttpServiceSetup, resolver: CapabilitiesResolver) {
  const router = http.createRouter('');
  registerCapabilitiesRoutes(router, resolver);
}
