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
export async function injectMigrationUI(server: any) {
  let isEnabled = (await server.kibanaMigrator.fetchMigrationProgress()) < 1;

  registerRoutes(server);

  server.kibanaMigrator.awaitMigration().then(() => (isEnabled = false));

  server.ext('onRequest', async (request: any, h: any) => {
    if (isEnabled) {
      return interceptRequest(server, request, h);
    }

    return h.continue();
  });
}

function interceptRequest(server: any, request: any, h: any) {
  // Hijack our own API endpoint so that it bypasses any
  // security shenanigans and properly serves to any UI.
  if (request.url.path === API_PATH) {
    return migrationProgressJSON(server.kibanaMigrator, h);
  }

  // If we're enabled, and someone's making an API request other
  // than our migration progress API, we'll disallow it.
  if (request.headers.accept.includes('json')) {
    throw Boom.serverUnavailable('Kibana is migrating and should be back online in a few minutes.');
  }

  // Hopefully, this is a plain ol' HTML request, because that's what
  // we're serving up.
  return migrationSplashScreen(server, h);
}

function registerRoutes(server: any) {
  // This route really should never be directly hit, but it is here
  // to prevent others from registering the API_PATH route. The actual
  // API_PATH endpoint is handled by our HTTP intercept logic.
  server.route({
    path: API_PATH,
    method: 'GET',
    config: {
      handler: (request: any, h: any) => {
        return migrationProgressJSON(server.kibanaMigrator, h);
      },
    },
  });
}

function migrationSplashScreen(server: any, h: any) {
  const config = server.config() as any;
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

async function migrationProgressJSON(migrator: any, h: any) {
  const response = h.response({
    progress: await migrator.fetchMigrationProgress(),
  });
  response.takeover();
  response.type('application/json');
  return response;
}
