/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ServerUrlService } from '../../types';

export const registerCreateRoute = (router: IRouter, url: ServerUrlService) => {
  router.post(
    {
      path: '/api/short_url',
      validate: {
        params: schema.object(
          {
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object({
          url: schema.object({
            slug: schema.string({
              defaultValue: '',
            }),
          }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const savedObjects = ctx.core.savedObjects.client;
      const shortUrls = url.shortUrls.get({ savedObjects });

      return res.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          foo: 'bar',
        }),
      });
    })
  );
};
