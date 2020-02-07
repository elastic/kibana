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

import { format } from 'url';
import { resolve } from 'path';
import _ from 'lodash';
import Boom from 'boom';

import { registerHapiPlugins } from './register_hapi_plugins';
import { setupBasePathProvider } from './setup_base_path_provider';
import { setupDefaultRouteProvider } from './setup_default_route_provider';

export default async function(kbnServer, server, config) {
  server = kbnServer.server;

  setupBasePathProvider(kbnServer);

  setupDefaultRouteProvider(server);

  await registerHapiPlugins(server);

  // provide a simple way to expose static directories
  server.decorate('server', 'exposeStaticDir', function(routePath, dirPath) {
    this.route({
      path: routePath,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: false,
          lookupCompressed: true,
        },
      },
      config: { auth: false },
    });
  });

  // helper for creating view managers for servers
  server.decorate('server', 'setupViews', function(path, engines) {
    this.views({
      path: path,
      isCached: config.get('optimize.viewCaching'),
      engines: _.assign({ pug: require('pug') }, engines || {}),
    });
  });

  server.route({
    path: '/',
    method: 'GET',
    async handler(req, h) {
      return h.redirect(await req.getDefaultRoute());
    },
  });

  server.route({
    method: 'GET',
    path: '/{p*}',
    handler: function(req, h) {
      const path = req.path;
      if (path === '/' || path.charAt(path.length - 1) !== '/') {
        throw Boom.notFound();
      }

      const pathPrefix = req.getBasePath() ? `${req.getBasePath()}/` : '';
      return h
        .redirect(
          format({
            search: req.url.search,
            pathname: pathPrefix + path.slice(0, -1),
          })
        )
        .permanent(true);
    },
  });

  // Expose static assets
  server.exposeStaticDir('/ui/{path*}', resolve(__dirname, '../../ui/public/assets'));
}
