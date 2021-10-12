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

export const registerResolveRoute = (router: IRouter, url: ServerUrlService) => {
  router.get(
    {
      path: '/api/short_url/_slug/{slug}',
      validate: {
        params: schema.object({
          slug: schema.string({
            minLength: 4,
            maxLength: 128,
          }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const slug = req.params.slug;
      const savedObjects = ctx.core.savedObjects.client;
      const shortUrls = url.shortUrls.get({ savedObjects });
      const shortUrl = await shortUrls.resolve(slug);

      return res.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: shortUrl.data,
      });
    })
  );
};
