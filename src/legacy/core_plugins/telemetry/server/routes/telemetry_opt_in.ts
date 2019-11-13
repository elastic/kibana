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
// @ts-ignore
import fetch from 'node-fetch';
import { getTelemetryAllowChangingOptInStatus } from '../telemetry_config';

import {
  TelemetrySavedObjectAttributes,
  updateTelemetrySavedObject,
} from '../telemetry_repository';

interface RegisterOptInRoutesParams {
  core: CoreSetup;
  currentKibanaVersion: string;
}

async function sendTelemetryChangeOptInStatus({
  server,
  newOptInStatus,
}: {
  server: any;
  newOptInStatus: boolean;
}) {
  const optInStatusUrl = config.get('telemetry.optInStatusUrl');
  server.log(
    ['debug', 'telemetry', 'optin'],
    `Sending change in opt-in status to the telemetry cluser.`
  );
  await fetch(optInStatusUrl, {
    method: 'post',
    body: JSON.stringify({
      // cluster_uuid: get(clusterInfo, 'cluster_uuid'),
      // cluser_uuid:  '',
      opt_in_status: newOptInStatus,
    }),
  });
}

export function registerTelemetryOptInRoutes({
  core,
  currentKibanaVersion,
}: RegisterOptInRoutesParams) {
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
      try {
        const newOptInStatus = req.payload.enabled;
        const attributes: TelemetrySavedObjectAttributes = {
          enabled: newOptInStatus,
          lastVersionChecked: currentKibanaVersion,
        };
        const config = req.server.config();
        const savedObjectsClient = req.getSavedObjectsClient();
        const configTelemetryAllowChangingOptInStatus = config.get(
          'telemetry.allowChangingOptInStatus'
        );

        const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
          telemetrySavedObject: savedObjectsClient,
          configTelemetryAllowChangingOptInStatus,
        });
        if (!allowChangingOptInStatus) {
          return h.response({ error: 'Not allowed to change Opt-in Status.' }).code(400);
        }

        const usageFetcher = config.get('telemetry.usageFetcher');
        if (usageFetcher === 'server') {
          await sendTelemetryChangeOptInStatus({
            server: req.server,
            newOptInStatus,
          });
        }

        await updateTelemetrySavedObject(savedObjectsClient, attributes);
        return h.response({}).code(200);
      } catch (err) {
        return boomify(err);
      }
    },
  });
}
