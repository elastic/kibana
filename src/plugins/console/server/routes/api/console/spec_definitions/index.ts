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
import { schema, TypeOf } from '@kbn/config-schema';
import { IRouter, RequestHandler } from 'kibana/server';
import { resolveApi } from '../../../../lib/spec_definitions';

export const registerSpecDefinitionsRoute = ({ router }: { router: IRouter }) => {
  const handler: RequestHandler<unknown, TypeOf<typeof validate.query>> = async (
    ctx,
    request,
    response
  ) => {
    const { sense_version: version, apis } = request.query;

    return response.ok({
      body: resolveApi(version, apis.split(',')),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const validate = {
    query: schema.object({
      sense_version: schema.string({ defaultValue: '' }),
      apis: schema.string(),
    }),
  };

  router.get({ path: '/api/console/api_server', validate }, handler);
  router.post({ path: '/api/console/api_server', validate }, handler);
};
