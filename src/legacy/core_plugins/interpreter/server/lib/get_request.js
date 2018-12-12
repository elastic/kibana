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

import boom from 'boom';
import { API_ROUTE } from '../../common/constants';

export function getRequest(server, { headers }) {
  const url = `${API_ROUTE}/ping`;

  return server
    .inject({
      method: 'POST',
      url,
      headers,
    })
    .then(res => {
      if (res.statusCode !== 200) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            new Error(`Auth request failed: [${res.statusCode}] ${res.result.message}`)
          );
        }
        throw boom.unauthorized('Failed to authenticate socket connection');
      }

      return res.request;
    });
}
