/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';

const UI_SETTINGS_API_PREFIX = '/internal/ftr/ui_settings';

export const registerRefreshRoute = (router: IRouter) => {
  router.post(
    {
      path: `${UI_SETTINGS_API_PREFIX}/_refresh`,
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: false,
    },
    async (ctx, _req, res) => {
      const { uiSettings } = await ctx.core;

      const refreshRequests = [
        uiSettings.client?.getUserProvided(true),
        uiSettings.globalClient?.getUserProvided(true),
      ].filter((request): request is Promise<unknown> => Boolean(request));

      await Promise.all(refreshRequests);

      return res.ok({
        body: {
          refreshed: true,
        },
      });
    }
  );
};
