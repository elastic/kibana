/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { shortUrlAssertValid } from './lib/short_url_assert_valid';
import { ShortUrlLookupService } from './lib/short_url_lookup';
import { CREATE_PATH } from '../../common/short_url_routes';

export const createShortenUrlRoute = ({
  shortUrlLookup,
  router,
}: {
  shortUrlLookup: ShortUrlLookupService;
  router: IRouter;
}) => {
  router.post(
    {
      path: CREATE_PATH,
      validate: {
        body: schema.object({ url: schema.string() }),
      },
    },
    router.handleLegacyErrors(async function (context, request, response) {
      shortUrlAssertValid(request.body.url);
      const urlId = await shortUrlLookup.generateUrlId(request.body.url, {
        savedObjects: context.core.savedObjects.client,
      });
      return response.ok({ body: { urlId } });
    })
  );
};
