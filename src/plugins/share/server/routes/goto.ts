/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup, IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { shortUrlAssertValid } from './lib/short_url_assert_valid';
import { ShortUrlLookupService } from './lib/short_url_lookup';
import { modifyUrl } from '../../../../core/utils';

export const createGotoRoute = ({
  router,
  shortUrlLookup,
  http,
}: {
  router: IRouter;
  shortUrlLookup: ShortUrlLookupService;
  http: CoreSetup['http'];
}) => {
  router.get(
    {
      path: '/goto/{urlId}',
      validate: {
        params: schema.object({ urlId: schema.string() }),
      },
    },
    router.handleLegacyErrors(async function(context, request, response) {
      const basePath = http.basePath.get(request);
      const url = await shortUrlLookup.getUrl(request.params.urlId, {
        savedObjects: context.core.savedObjects.client,
      });
      shortUrlAssertValid(url);

      const uiSettings = context.core.uiSettings.client;
      const stateStoreInSessionStorage = await uiSettings.get('state:storeInSessionStorage');
      if (!stateStoreInSessionStorage) {
        const prependedUrl = modifyUrl(url, parts => {
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

      const prependedLegacyRedirectUrl = modifyUrl('/goto_LP/' + request.params.urlId, parts => {
        if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
          parts.pathname = `${basePath}${parts.pathname}`;
        }
      });

      return response.redirected({
        headers: {
          location: prependedLegacyRedirectUrl,
        },
      });
    })
  );
};
