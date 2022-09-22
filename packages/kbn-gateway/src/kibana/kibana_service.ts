/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import type { Logger, LoggerFactory } from '@kbn/logging';
import { ConfigStart } from '../config';
import { ServerStart } from '../server';
import type { KibanaConfigType } from './kibana_config';

interface KibanaServiceStartDependencies {
  server: ServerStart;
}

interface KibanaServiceDependencies {
  logger: LoggerFactory;
  config: ConfigStart;
}

/**
 * A service to interact with the configured `kibana.hosts`.
 */
export class KibanaService {
  private readonly log: Logger;
  private readonly config: ConfigStart;

  constructor({ logger, config }: KibanaServiceDependencies) {
    this.log = logger.get('kibana-service');
    this.config = config;
  }

  async start({ server }: KibanaServiceStartDependencies) {
    server.addRoute({
      method: 'GET',
      path: '/api/status',
      handler: async (req: any, h: any) => {
        const responses = await this.fetchKibanaResponses('/api/status');
        // For now we're being super naïve and returning the highest status code
        const statusCode = responses.reduce((acc, cur) => (cur.status > acc ? cur.status : acc), 0);
        // Need to determine what response body, if any, we want to include
        return h.response({}).type('application/json').code(statusCode);
      },
    });
  }

  stop() {
    // nothing to do here yet
  }

  private async fetchKibanaResponses(route: string) {
    const requests = await Promise.allSettled(
      this.config.atPathSync<KibanaConfigType>('kibana').hosts.map(async (host) => {
        this.log.info(`Fetching response from ${host}${route}`);
        const response = await fetch(`${host}${route}`);
        const responseJson = await response.json();
        this.log.info(
          `Got response from ${host}${route}: ${JSON.stringify(responseJson.status.overall)}`
        );
        return response;
      })
    );

    return requests.map((r) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        this.log.error(`Unable to retrieve status from Kibana: ${JSON.stringify(r.reason)}`);
        throw new Error(r.reason);
      }
    });
  }
}
