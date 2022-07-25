/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup, IRouter } from '@kbn/core/server';

/**
 * This endpoint maintains the legacy /goto/<short_url_id> route. It loads the
 * /app/goto/<short_url_id> app which handles the redirection.
 */
export const registerGotoRoute = (router: IRouter, core: CoreSetup) => {
  core.http.resources.register(
    {
      path: '/goto/{id}',
      validate: {
        params: schema.object({
          id: schema.string({
            minLength: 4,
            maxLength: 128,
          }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      return res.renderCoreApp();
    })
  );
};
