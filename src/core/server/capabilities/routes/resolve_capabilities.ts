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

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CapabilitiesResolver } from '../resolve_capabilities';

export function registerCapabilitiesRoutes(router: IRouter, resolver: CapabilitiesResolver) {
  // Capabilities are fetched on both authenticated and anonymous routes.
  // However when `authRequired` is false, authentication is not performed
  // and only default capabilities are returned (all disabled), even for authenticated users.
  // So we need two endpoints to handle both scenarios.
  [true, false].forEach(authRequired => {
    router.post(
      {
        path: authRequired ? '' : '/defaults',
        options: {
          authRequired,
        },
        validate: {
          body: schema.object({
            applications: schema.arrayOf(schema.string()),
          }),
        },
      },
      async (ctx, req, res) => {
        const { applications } = req.body;
        const capabilities = await resolver(req, applications);
        return res.ok({
          body: capabilities,
        });
      }
    );
  });
}
