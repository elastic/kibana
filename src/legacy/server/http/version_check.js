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

export function setupVersionCheck(server, config) {
  const versionHeader = 'kbn-version';
  const actualVersion = config.get('pkg.version');

  server.ext('onPostAuth', function onPostAuthVersionCheck(req, h) {
    const versionRequested = req.headers[versionHeader];

    if (versionRequested && versionRequested !== actualVersion) {
      throw badRequest(
        `Browser client is out of date, \
        please refresh the page ("${versionHeader}" header was "${versionRequested}" but should be "${actualVersion}")`,
        { expected: actualVersion, got: versionRequested }
      );
    }

    return h.continue;
  });
}
