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
import { IRouter } from '../../../../../../core/server';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { assertIndexPatternsContext } from '../util/assert_index_patterns_context';
import { handleErrors } from '../util/handle_errors';

export const registerDeleteFieldRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/api/index_patterns/index_pattern/{id}/field/{name}',
      validate: {
        params: schema.object(
          {
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
            name: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    router.handleLegacyErrors(
      handleErrors(
        assertIndexPatternsContext(async (ctx, req, res) => {
          const ip = ctx.indexPatterns.indexPatterns;
          const id = req.params.id;
          const name = req.params.name;

          const indexPattern = await ip.get(id);
          const field = indexPattern.fields.getByName(name);

          if (!field) {
            throw new ErrorIndexPatternFieldNotFound(id, name);
          }

          indexPattern.fields.remove(field);

          await ip.updateSavedObject(indexPattern);

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
          });
        })
      )
    )
  );
};
