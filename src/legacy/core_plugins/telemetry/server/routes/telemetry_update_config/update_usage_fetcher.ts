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

import Joi from 'joi';
import { boomify } from 'boom';
import { CoreSetup } from 'src/core/server';
import {
  TelemetrySavedObjectAttributes,
  updateTelemetrySavedObject,
} from '../../telemetry_repository';

interface RegisterUsageFetcherRouteParams {
  core: CoreSetup;
}

export function registerUsageFetcherRoute({ core }: RegisterUsageFetcherRouteParams) {
  const { server } = core.http as any;

  server.route({
    method: 'POST',
    path: '/api/telemetry/v2/usageFetcher',
    options: {
      validate: {
        payload: Joi.object({
          usageFetcher: Joi.string()
            .allow(['browser', 'server'])
            .required(),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      try {
        const attributes: TelemetrySavedObjectAttributes = req.payload;
        const savedObjectsClient = req.getSavedObjectsClient();
        await updateTelemetrySavedObject(savedObjectsClient, attributes);
      } catch (err) {
        return boomify(err);
      }
      return h.response({}).code(200);
    },
  });
}
