/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { format } from 'url';
import Boom from '@hapi/boom';

import { registerHapiPlugins } from './register_hapi_plugins';
import { setupBasePathProvider } from './setup_base_path_provider';

export default async function (kbnServer, server) {
  server = kbnServer.server;

  setupBasePathProvider(kbnServer);

  await registerHapiPlugins(server);

  server.route({
    method: 'GET',
    path: '/{p*}',
    handler: function (req, h) {
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
}
