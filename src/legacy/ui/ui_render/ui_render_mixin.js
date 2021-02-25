/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import { KibanaRequest } from '../../../core/server';
import { getApmConfig } from '../apm';

/**
 *
 * @param {KbnServer} kbnServer
 * @param {KbnServer.server} server
 */
export function uiRenderMixin(kbnServer, server) {
  server.route({
    path: '/app/{id}/{any*}',
    method: 'GET',
    async handler(req, h) {
      try {
        return await h.renderApp();
      } catch (err) {
        throw Boom.boomify(err);
      }
    },
  });

  async function renderApp(h) {
    const { http } = kbnServer.newPlatform.setup.core;
    const { savedObjects } = kbnServer.newPlatform.start.core;
    const { rendering } = kbnServer.newPlatform.__internals;
    const req = KibanaRequest.from(h.request);
    const uiSettings = kbnServer.newPlatform.start.core.uiSettings.asScopedToClient(
      savedObjects.getScopedClient(req)
    );
    const vars = {
      apmConfig: getApmConfig(h.request.path),
    };
    const content = await rendering.render(h.request, uiSettings, {
      includeUserSettings: true,
      vars,
    });

    return h.response(content).type('text/html').header('content-security-policy', http.csp.header);
  }

  server.decorate('toolkit', 'renderApp', function () {
    return renderApp(this);
  });
}
