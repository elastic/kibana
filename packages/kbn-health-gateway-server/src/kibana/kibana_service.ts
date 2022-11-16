/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IConfigService } from '@kbn/config';
import type { Logger, LoggerFactory } from '@kbn/logging';
import { ServerStart } from '../server';
import { RootRoute } from './routes';

interface KibanaServiceStartDependencies {
  server: ServerStart;
}

interface KibanaServiceDependencies {
  logger: LoggerFactory;
  config: IConfigService;
}

/**
 * A service to interact with the configured `kibana.hosts`.
 */
export class KibanaService {
  private readonly logger: Logger;
  private readonly config: IConfigService;

  constructor({ logger, config }: KibanaServiceDependencies) {
    this.logger = logger.get('kibana-service');
    this.config = config;
  }

  async start({ server }: KibanaServiceStartDependencies) {
    server.addRoute(new RootRoute({ config: this.config, logger: this.logger }));
  }

  stop() {
    // nothing to do here yet
  }
}
