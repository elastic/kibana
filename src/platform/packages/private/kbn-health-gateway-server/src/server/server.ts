/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server as HapiServer, ServerRoute as HapiServerRoute } from '@hapi/hapi';
import { createServer, getServerOptions } from '@kbn/server-http-tools';
import type { IConfigService } from '@kbn/config';
import type { Logger, LoggerFactory } from '@kbn/logging';
import { ServerConfig } from './server_config';
import type { ServerConfigType } from './server_config';

interface ServerDeps {
  logger: LoggerFactory;
  config: IConfigService;
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
  private readonly config: IConfigService;
  private server?: HapiServer;

  constructor({ logger, config }: ServerDeps) {
    this.log = logger.get('server');
    this.config = config;
  }

  async start(): Promise<ServerStart> {
    const serverConfig = new ServerConfig(this.config.atPathSync<ServerConfigType>('server'));
    this.server = createServer(getServerOptions(serverConfig));

    await this.server.start();
    this.log.info(`Server running on ${this.server.info.uri}`);

    return {
      addRoute: (definition) => {
        this.log.debug(`Registering route handler for [${definition.path}]`);
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
