/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { modifyUrl } from '@kbn/std';

import { shortUrlAssertValid } from './lib/short_url_assert_valid';
import { ShortUrlLookupService } from './lib/short_url_lookup';
import { getGotoPath } from '../../common/short_url_routes';

export const createGotoRoute = ({
  router,
  shortUrlLookup,
  http,
}: {
  router: IRouter;
  shortUrlLookup: ShortUrlLookupService;
  http: CoreSetup['http'];
}) => {
  http.resources.register(
    {
      path: getGotoPath('{urlId}'),
      validate: {
        params: schema.object({ urlId: schema.string() }),
      },
    },
    router.handleLegacyErrors(async function (context, request, response) {
      const url = await shortUrlLookup.getUrl(request.params.urlId, {
        savedObjects: context.core.savedObjects.client,
      });
      shortUrlAssertValid(url);

      const uiSettings = context.core.uiSettings.client;
      const stateStoreInSessionStorage = await uiSettings.get('state:storeInSessionStorage');
      if (!stateStoreInSessionStorage) {
        const basePath = http.basePath.get(request);

        const prependedUrl = modifyUrl(url, (parts) => {
          if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
            parts.pathname = `${basePath}${parts.pathname}`;
          }
        });
        return response.redirected({
          headers: {
            location: prependedUrl,
          },
        });
      }

      return response.renderCoreApp();
    })
  );
};
