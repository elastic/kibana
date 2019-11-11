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

interface RegisterOptInRoutesParams {
  core: CoreSetup;
  currentKibanaVersion: string;
}

export interface SavedObjectAttributes {
  enabled?: boolean;
  lastVersionChecked: string;
}

export function registerOptInRoutes({ core, currentKibanaVersion }: RegisterOptInRoutesParams) {
  const { server } = core.http as any;

  server.route({
    method: 'POST',
    path: '/api/telemetry/v2/optIn',
    options: {
      validate: {
        payload: Joi.object({
          enabled: Joi.bool().required(),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      const savedObject: SavedObjectAttributes = {
        enabled: req.payload.enabled,
        lastVersionChecked: currentKibanaVersion,
      };
      const options = {
        id: 'telemetry',
        overwrite: true,
      };
      try {
        await savedObjectsClient.create('telemetry', savedObject, options);
      } catch (err) {
        return boomify(err);
      }
      return h.response({}).code(200);
    },
  });
}
