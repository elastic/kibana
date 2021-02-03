/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import KbnServer from '../kbn_server';

/**
 * Exposes `kbnServer.newPlatform` through Hapi API.
 * @param kbnServer KbnServer singleton instance.
 * @param server Hapi server instance to expose `core` on.
 */
export function coreMixin(kbnServer: KbnServer, server: Server) {
  // we suppress type error because hapi expect a function here not an object
  server.decorate('server', 'newPlatform', kbnServer.newPlatform as any);
}
