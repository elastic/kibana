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
import { handleErrors } from './util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../plugin';

export const registerValidatePatternListActiveRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.post(
    {
      path: '/api/index_patterns/_validate_pattern_list_active',
      validate: {
        body: schema.object({
          id: schema.string(),
          patternList: schema.arrayOf(schema.string()),
          patternListActive: schema.arrayOf(schema.string()),
          version: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const { patternList } = req.body;
        const result = await Promise.all(
          patternList.map((pattern) =>
            elasticsearchClient.transport.request({
              method: 'GET',
              path: `/_resolve/index/${encodeURIComponent(pattern)}`,
            })
          )
        );
        const patternListActive = result.reduce(
          (acc: string[], { body: indexLookup }, patternListIndex) =>
            indexLookup.indices && indexLookup.indices.length > 0
              ? [...acc, patternList[patternListIndex]]
              : acc,
          []
        );

        return res.ok({ body: patternListActive });
      })
    )
  );
};
