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

import { CoreSetup } from 'kibana/public';
import { getUrlIdFromGotoRoute, getUrlPath, GOTO_PREFIX } from '../../common/short_url_routes';

export const createShortUrlRedirectApp = (core: CoreSetup, location: Location) => ({
  id: 'short_url_redirect',
  appRoute: GOTO_PREFIX,
  chromeless: true,
  title: 'Short URL Redirect',
  async mount() {
    const urlId = getUrlIdFromGotoRoute(location.pathname);

    if (!urlId) {
      throw new Error('Url id not present in path');
    }

    const response = await core.http.get<{ url: string }>(getUrlPath(urlId));
    const redirectUrl = response.url;
    const { hashUrl } = await import('../../../kibana_utils/public');
    const hashedUrl = hashUrl(redirectUrl);
    const url = core.http.basePath.prepend(hashedUrl);

    location.href = url;

    return () => {};
  },
});
