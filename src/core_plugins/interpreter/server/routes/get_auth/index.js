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

// TODO: Fix this first. This route returns decrypts the cookie and returns the basic auth header. It is used because
// the pre-route hapi hook doesn't work on the socket and there are no exposed methods for doing the conversion from cookie
// to auth header. We will need to add that to x-pack security
// In theory this is pretty difficult to exploit, but not impossible.
//
export function getAuth(server) {
  server.route({
    method: 'GET',
    path: insecureAuthRoute,
    handler: function (request, reply) {
      reply(request.headers.authorization);
    },
  });
}
