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
import moment from 'moment';
import { boomify } from 'boom';
import { CoreSetup } from 'src/core/server';
import { getTelemetryAllowChangingOptInStatus } from '../telemetry_config';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';

import {
  TelemetrySavedObjectAttributes,
  updateTelemetrySavedObject,
} from '../telemetry_repository';

interface RegisterOptInRoutesParams {
  core: CoreSetup;
  currentKibanaVersion: string;
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

        const sendUsageFrom = config.get('telemetry.sendUsageFrom');
        if (sendUsageFrom === 'server') {
          const optInStatusUrl = config.get('telemetry.optInStatusUrl');
          await sendTelemetryOptInStatus(
            { optInStatusUrl, newOptInStatus },
            {
              start: moment()
                .subtract(20, 'minutes')
                .toISOString(),
              end: moment().toISOString(),
              server: req.server,
              unencrypted: false,
            }
          );
        }

        await updateTelemetrySavedObject(savedObjectsClient, attributes);
        return h.response({}).code(200);
      } catch (err) {
        return boomify(err);
      }
    },
  });
}
