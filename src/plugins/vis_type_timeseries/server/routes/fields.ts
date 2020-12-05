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

import { isBoom } from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { getFields } from '../lib/get_fields';
import { Framework } from '../plugin';
import { ROUTES } from '../../common/constants';

export const fieldsRoutes = (framework: Framework) => {
  framework.router.get(
    {
      path: ROUTES.FIELDS,
      validate: {
        query: schema.object({ index: schema.string() }),
      },
    },
    async (context, req, res) => {
      try {
        return res.ok({ body: await getFields(context, req, framework, req.query.index) });
      } catch (err) {
        if (isBoom(err) && err.output.statusCode === 401) {
          return res.customError({
            body: err.output.payload,
            statusCode: err.output.statusCode,
            headers: err.output.headers,
          });
        }

        return res.ok({
          body: [],
        });
      }
    }
  );
};
