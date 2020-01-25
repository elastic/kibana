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
import { PulseChannel } from '../channel';
import { RegisterRoute } from './types';
// we need the current Kibana Version to send in all of the payloads
const validate = {
  params: schema.object({
    channel: schema.string(),
  }),
  body: schema.object({
    payload: schema.object(
      {
        channelId: schema.maybe(schema.string()),
        deploymentId: schema.maybe(schema.string()),
        timestamp: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
        message: schema.string(),
        hash: schema.string(),
        fixedVersion: schema.maybe(schema.string()),
        status: schema.maybe(schema.string()),
        currentKibanaVersion: schema.maybe(schema.string()),
      },
      { allowUnknowns: true }
    ),
  }),
};

export const registerIndexRoute: RegisterRoute = (
  router: IRouter,
  channels: Map<string, PulseChannel>
) => {
  return router.post(
    { path: '/api/pulse_local/{channel}', validate },
    async (context, request, response) => {
      try {
        const { channel } = request.params;
        const { payload } = request.body;
        const ch = channels.get(channel);

        await ch?.sendPulse(payload);
        return response.ok({
          body: {
            message: `payload: ${payload} received`,
          },
        });
      } catch (error) {
        return response.badRequest({ body: error });
      }
    }
  );
};
