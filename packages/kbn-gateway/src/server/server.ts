/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { server } from '@hapi/hapi';
import type { Server as HapiServer, ServerRoute as HapiServerRoute } from '@hapi/hapi';
import type { Logger, LoggerFactory } from '@kbn/logging';
import { ConfigStart } from '../config';
import type { ServerConfigType } from './server_config';

interface ServerDeps {
  logger: LoggerFactory;
  config: ConfigStart;
}

type RouteDefinition = HapiServerRoute;

export interface ServerStart {
  addRoute: (routeDefinition: RouteDefinition) => void;
}

/**
 * A very thin wrapper around Hapi, which only exposes the functionality we
 * need for this app.
 */
export class Server {
  private readonly log: Logger;
  private readonly config: ConfigStart;
  private server?: HapiServer;

  constructor({ logger, config }: ServerDeps) {
    this.log = logger.get('server');
    this.config = config;
  }

  async start(): Promise<ServerStart> {
    const { port, host } = this.config.atPathSync<ServerConfigType>('server');
    this.server = server({ port, host });

    await this.server.start();
    this.log.info(`Server running on ${this.server.info.uri}`);

    return {
      addRoute: (definition) => {
        this.log.debug(`Registering route: ${definition.method} ${definition.path}`);
        this.server!.route(definition);
      },
    };
  }

  async stop() {
    this.log.debug('Attempting graceful shutdown');
    if (this.server) {
      await this.server.stop();
    }
  }
}
