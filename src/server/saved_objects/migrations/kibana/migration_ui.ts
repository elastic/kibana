/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';
import { IndexMigrator } from '../core';
import { Server } from './kbn_server';

// We don't have type definitions for @kbn/i18n, so we'll
// require it this way in order to bypass TypeScript's complaints.
// tslint:disable-next-line:no-var-requires
const { i18n } = require('@kbn/i18n');
const API_PATH = '/api/migration_progress';

/**
 * This module is responsible for serving up the UI that is displayed while
 * the Kibana index is migrating. It also exposes an API endpoint that the
 * UI polls for progress, and it intercepts all HTTP traffic while migrations
 * are running.
 */
export class MigrationUI {
  private isEnabled: boolean;
  private server: any;
  private migrator: IndexMigrator;

  /**
   * Creates a new MigratinoUI object.
   *
   * @param server - Kibana's hapi server
   * @param migrator - The instance of IndexMigrator that is going to migrate the Kibana index
   */
  constructor(server: Server, migrator: IndexMigrator) {
    this.server = server;
    this.migrator = migrator;
    this.isEnabled = migrator.requiresMigration;

    this.registerRoutes();
    this.interceptHTTP();
  }

  /**
   * Disables the intercepting of Kibana's HTTP requests.
   */
  public disable() {
    this.isEnabled = false;
  }

  private registerRoutes() {
    // This route really should never be directly hit, but it is here
    // to prevent others from registering the API_PATH route. The actual
    // API_PATH endpoint is handled by our HTTP intercept logic.
    this.server.route({
      path: API_PATH,
      method: 'GET',
      config: {
        handler: (request: any, h: any) => {
          return this.migrationProgressJSON(h);
        },
      },
    });
  }

  private interceptHTTP() {
    this.server.ext('onRequest', async (request: any, h: any) => {
      // Hijack our own API endpoint so that it bypasses any
      // security shenanigans and properly serves to any UI.
      if (request.url.path === API_PATH) {
        return this.migrationProgressJSON(h);
      }

      // If we're disabled, we need to essentially passthrough
      if (!this.isEnabled) {
        return h.continue();
      }

      // If we're enabled, and someone's making an API request other
      // than our migration progress API, we'll disallow it.
      if (request.headers.accept.includes('json')) {
        throw Boom.serverUnavailable(
          'Kibana is migrating and should be back online in a few minutes.'
        );
      }

      // Hopefully, this is a plain ol' HTML request, because that's what
      // we're serving up.
      return this.migrationSplashScreen(h);
    });
  }

  private async migrationProgressJSON(h: any) {
    const response = h.response({
      progress: await this.migrator.fetchProgress(),
    });
    response.takeover();
    response.type('application/json');
    return response;
  }

  private migrationSplashScreen(h: any) {
    const config = this.server.config() as any;
    const basePath = config.get('server.rewriteBasePath') ? config.get('server.basePath') : '';
    const response = h.view('migration_ui', {
      migrationProgressUrl: `${basePath}${API_PATH}`,
      uiPublicUrl: `${basePath}/ui`,
      i18n: (...args: any[]) => i18n.translate(...args),
    });
    response.takeover();
    response.type('text/html');
    return response;
  }
}
