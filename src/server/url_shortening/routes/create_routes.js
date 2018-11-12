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
import { shortUrlLookupProvider } from './lib/short_url_lookup';
import { createGotoRoute } from './goto';
import { createShortenUrlRoute } from './shorten_url';


export function createRoutes(server, config) {
  const shortUrlLookup = shortUrlLookupProvider(server);

  server.route(createGotoRoute({ server, config, shortUrlLookup }));
  server.route(createShortenUrlRoute({ shortUrlLookup }));

  // TODO remove deprecated '/shorten' API in master (7.0)
  server.route({
    method: 'POST',
    path: '/shorten',
    handler: async function (request) {
      server.log(
        ['warning', 'deprecation'],
        `'/shorten' API has been deprecated and will be removed in 7.0, use the '/api/shorten_url' API instead`);
      try {
        shortUrlAssertValid(request.payload.url);
        const urlId = await shortUrlLookup.generateUrlId(request.payload.url, request);
        return urlId;
      } catch (err) {
        return handleShortUrlError(err);
      }
    }
  });
}
