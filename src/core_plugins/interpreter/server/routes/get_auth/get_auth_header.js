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

import { insecureAuthRoute } from './insecure_auth_route';

// TODO: OMG. No. Need a better way of setting to this than our wacky route thing.
export function getAuthHeader(request, server) {
  const basePath = server.config().get('server.basePath') || '';
  const fullPath = `${basePath}${insecureAuthRoute}`;

  return server
    .inject({
      method: 'GET',
      url: fullPath,
      headers: request.headers,
    })
    .then(res => res.result);
}
