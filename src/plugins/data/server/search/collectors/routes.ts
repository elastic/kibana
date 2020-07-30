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
import { CoreSetup } from '../../../../../core/server';
import { DataPluginStart } from '../../plugin';
import { SearchUsage } from './usage';

export function registerSearchUsageRoute(
  core: CoreSetup<object, DataPluginStart>,
  usage: SearchUsage
): void {
  const router = core.http.createRouter();

  router.post(
    {
      path: '/api/search/usage',
      validate: {
        body: schema.object({
          eventType: schema.string(),
          duration: schema.number(),
        }),
      },
    },
    async (context, request, res) => {
      const { eventType, duration } = request.body;

      if (eventType === 'success') usage.trackSuccess(duration);
      if (eventType === 'error') usage.trackError(duration);

      return res.ok();
    }
  );
}
