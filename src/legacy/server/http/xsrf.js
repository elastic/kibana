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

import { badRequest } from 'boom';

export function setupXsrf(server, config) {
  const disabled = config.get('server.xsrf.disableProtection');
  const whitelist = config.get('server.xsrf.whitelist');
  const versionHeader = 'kbn-version';
  const xsrfHeader = 'kbn-xsrf';

  server.ext('onPostAuth', function onPostAuthXsrf(req, h) {
    if (disabled) {
      return h.continue;
    }

    if (whitelist.includes(req.path)) {
      return h.continue;
    }

    const isSafeMethod = req.method === 'get' || req.method === 'head';
    const hasVersionHeader = versionHeader in req.headers;
    const hasXsrfHeader = xsrfHeader in req.headers;

    if (!isSafeMethod && !hasVersionHeader && !hasXsrfHeader) {
      throw badRequest(`Request must contain a ${xsrfHeader} header.`);
    }

    return h.continue;
  });
}
