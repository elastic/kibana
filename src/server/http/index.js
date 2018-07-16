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
import Hapi from 'hapi';
import { setupVersionCheck } from './version_check';
import { handleShortUrlError } from './short_url_error';
import { shortUrlAssertValid } from './short_url_assert_valid';
import { shortUrlLookupProvider } from './short_url_lookup';
import { registerHapiPlugins } from './register_hapi_plugins';
import { setupXsrf } from './xsrf';

export default async function (kbnServer, server, config) {
  kbnServer.server = new Hapi.Server();
  server = kbnServer.server;

  const shortUrlLookup = shortUrlLookupProvider(server);

  // Note that all connection options configured here should be exactly the same
  // as in `getServerOptions()` in the new platform (see `src/core/server/http/http_tools`).
  // Any change SHOULD BE applied in both places.
  server.connection({
    host: config.get('server.host'),
    port: config.get('server.port'),
    listener: kbnServer.newPlatform.proxyListener,
    state: {
      strictHeader: false,
    },
    routes: {
      cors: config.get('server.cors'),
      payload: {
        maxBytes: config.get('server.maxPayloadBytes'),
      },
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
  });

  registerHapiPlugins(server);

  // provide a simple way to expose static directories
  server.decorate('server', 'exposeStaticDir', function (routePath, dirPath) {
    this.route({
      path: routePath,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: false,
          lookupCompressed: true
        }
      },
      config: { auth: false }
    });
  });

  // helper for creating view managers for servers
  server.decorate('server', 'setupViews', function (path, engines) {
    this.views({
      path: path,
      isCached: config.get('optimize.viewCaching'),
      engines: _.assign({ jade: require('jade') }, engines || {})
    });
  });

  // attach the app name to the server, so we can be sure we are actually talking to kibana
  server.ext('onPreResponse', function (req, reply) {
    const response = req.response;

    const customHeaders = {
      ...config.get('server.customResponseHeaders'),
      'kbn-name': kbnServer.name,
      'kbn-version': kbnServer.version,
    };

    if (response.isBoom) {
      response.output.headers = {
        ...response.output.headers,
        ...customHeaders
      };
    } else {
      Object.keys(customHeaders).forEach(name => {
        response.header(name, customHeaders[name]);
      });
    }

    return reply.continue();
  });

  server.route({
    path: '/',
    method: 'GET',
    handler(req, reply) {
      const basePath = config.get('server.basePath');
      const defaultRoute = config.get('server.defaultRoute');
      reply.redirect(`${basePath}${defaultRoute}`);
    }
  });

  server.route({
    method: 'GET',
    path: '/{p*}',
    handler: function (req, reply) {
      const path = req.path;
      if (path === '/' || path.charAt(path.length - 1) !== '/') {
        return reply(Boom.notFound());
      }
      const pathPrefix = config.get('server.basePath') ? `${config.get('server.basePath')}/` : '';
      return reply.redirect(format({
        search: req.url.search,
        pathname: pathPrefix + path.slice(0, -1),
      }))
        .permanent(true);
    }
  });

  server.route({
    method: 'GET',
    path: '/goto/{urlId}',
    handler: async function (request, reply) {
      try {
        const url = await shortUrlLookup.getUrl(request.params.urlId, request);
        shortUrlAssertValid(url);

        const uiSettings = request.getUiSettingsService();
        const stateStoreInSessionStorage = await uiSettings.get('state:storeInSessionStorage');
        if (!stateStoreInSessionStorage) {
          reply().redirect(config.get('server.basePath') + url);
          return;
        }

        const app = server.getHiddenUiAppById('stateSessionStorageRedirect');
        reply.renderApp(app, {
          redirectUrl: url,
        });
      } catch (err) {
        reply(handleShortUrlError(err));
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/shorten',
    handler: async function (request, reply) {
      try {
        shortUrlAssertValid(request.payload.url);
        const urlId = await shortUrlLookup.generateUrlId(request.payload.url, request);
        reply(urlId);
      } catch (err) {
        reply(handleShortUrlError(err));
      }
    }
  });

  // Expose static assets (fonts, favicons).
  server.exposeStaticDir('/ui/fonts/{path*}', resolve(__dirname, '../../ui/public/assets/fonts'));
  server.exposeStaticDir('/ui/favicons/{path*}', resolve(__dirname, '../../ui/public/assets/favicons'));

  setupVersionCheck(server, config);
  setupXsrf(server, config);
}
