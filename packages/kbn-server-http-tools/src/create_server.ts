/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server, type ServerOptions } from '@hapi/hapi';
import type { ServerListener } from './types';

export function createServer(serverOptions: ServerOptions, listener: ServerListener): Server {
  const server = new Server({
    ...serverOptions,
    // HAPI type signatures are outdated and only define http1 listener
    listener: listener as ServerOptions['listener'],
  });

  return server;
}
