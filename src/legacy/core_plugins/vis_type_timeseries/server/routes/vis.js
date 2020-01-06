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
import { getVisData } from '../lib/get_vis_data';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const visDataRoutes = (router, framework) => {
  router.post(
    {
      path: '/api/metrics/vis/data',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const results = await getVisData(requestContext, request.body, framework);
        return response.ok({ body: results });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
