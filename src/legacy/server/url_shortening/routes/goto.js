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

import { handleShortUrlError } from './lib/short_url_error';
import { shortUrlAssertValid } from './lib/short_url_assert_valid';

export const createGotoRoute = ({ server, shortUrlLookup }) => ({
  method: 'GET',
  path: '/goto/{urlId}',
  handler: async function(request, h) {
    try {
      const url = await shortUrlLookup.getUrl(request.params.urlId, request);
      shortUrlAssertValid(url);

      const uiSettings = request.getUiSettingsService();
      const stateStoreInSessionStorage = await uiSettings.get('state:storeInSessionStorage');
      if (!stateStoreInSessionStorage) {
        return h.redirect(request.getBasePath() + url);
      }

      const app = server.getHiddenUiAppById('stateSessionStorageRedirect');
      return h.renderApp(app, {
        redirectUrl: url,
      });
    } catch (err) {
      throw handleShortUrlError(err);
    }
  },
});
