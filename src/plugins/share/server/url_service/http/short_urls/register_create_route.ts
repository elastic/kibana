/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { UrlServiceError } from '../../error';
import { ServerUrlService } from '../../types';

export const registerCreateRoute = (router: IRouter, url: ServerUrlService) => {
  router.post(
    {
      path: '/api/short_url',
      validate: {
        body: schema.object({
          locatorId: schema.string({
            minLength: 1,
            maxLength: 255,
          }),
          slug: schema.string({
            defaultValue: '',
            minLength: 3,
            maxLength: 255,
          }),
          humanReadableSlug: schema.boolean({
            defaultValue: false,
          }),
          params: schema.object({}, { unknowns: 'allow' }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const savedObjects = ctx.core.savedObjects.client;
      const shortUrls = url.shortUrls.get({ savedObjects });
      const { locatorId, params, slug, humanReadableSlug } = req.body;
      const locator = url.locators.get(locatorId);

      if (!locator) {
        return res.customError({
          statusCode: 409,
          body: 'Locator not found.',
        });
      }

      try {
        const shortUrl = await shortUrls.create({
          locator,
          params,
          slug,
          humanReadableSlug,
        });

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: shortUrl.data,
        });
      } catch (error) {
        if (error instanceof UrlServiceError) {
          if (error.code === 'SLUG_EXISTS') {
            return res.customError({
              statusCode: 409,
              body: error.message,
            });
          }
        }
        throw error;
      }
    })
  );
};
