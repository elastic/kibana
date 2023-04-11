/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../http';
import type { BootstrapRenderer } from './bootstrap_renderer';

export const registerBootstrapRoute = ({
  router,
  renderer,
}: {
  router: IRouter;
  renderer: BootstrapRenderer;
}) => {
  router.get(
    {
      path: '/bootstrap.js',
      options: {
        tags: ['api'],
      },
      validate: false,
    },
    async (ctx, req, res) => {
      const uiSettingsClient = ctx.core.uiSettings.client;
      const { body, etag } = await renderer({ uiSettingsClient, request: req });

      return res.ok({
        body,
        headers: {
          etag,
          'content-type': 'application/javascript',
          'cache-control': 'must-revalidate',
        },
      });
    }
  );
  router.get(
    {
      path: '/bootstrap-anonymous.js',
      options: {
        authRequired: 'optional',
        tags: ['api'],
      },
      validate: false,
    },
    async (ctx, req, res) => {
      const uiSettingsClient = ctx.core.uiSettings.client;
      const { body, etag } = await renderer({
        uiSettingsClient,
        request: req,
        isAnonymousPage: true,
      });

      return res.ok({
        body,
        headers: {
          etag,
          'content-type': 'application/javascript',
          'cache-control': 'must-revalidate',
        },
      });
    }
  );
};
