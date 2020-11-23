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

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { IRouter, Logger } from 'kibana/server';
import {
  StatsGetterConfig,
  TelemetryCollectionManagerPluginSetup,
} from 'src/plugins/telemetry_collection_manager/server';
import { SavedObjectsErrorHelpers } from '../../../../core/server';
import { getTelemetryAllowChangingOptInStatus } from '../../common/telemetry_config';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';

import {
  TelemetrySavedObjectAttributes,
  updateTelemetrySavedObject,
  getTelemetrySavedObject,
} from '../telemetry_repository';
import { TelemetryConfigType } from '../config';

interface RegisterOptInRoutesParams {
  currentKibanaVersion: string;
  router: IRouter;
  logger: Logger;
  config$: Observable<TelemetryConfigType>;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export function registerTelemetryOptInRoutes({
  config$,
  logger,
  router,
  currentKibanaVersion,
  telemetryCollectionManager,
}: RegisterOptInRoutesParams) {
  router.post(
    {
      path: '/api/telemetry/v2/optIn',
      validate: {
        body: schema.object({ enabled: schema.boolean() }),
      },
    },
    async (context, req, res) => {
      const newOptInStatus = req.body.enabled;
      const attributes: TelemetrySavedObjectAttributes = {
        enabled: newOptInStatus,
        lastVersionChecked: currentKibanaVersion,
      };
      const config = await config$.pipe(take(1)).toPromise();
      const telemetrySavedObject = await getTelemetrySavedObject(context.core.savedObjects.client);

      if (telemetrySavedObject === false) {
        // If we get false, we couldn't get the saved object due to lack of permissions
        // so we can assume the user won't be able to update it either
        return res.forbidden();
      }

      const configTelemetryAllowChangingOptInStatus = config.allowChangingOptInStatus;
      const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
        telemetrySavedObject,
        configTelemetryAllowChangingOptInStatus,
      });
      if (!allowChangingOptInStatus) {
        return res.badRequest({
          body: JSON.stringify({ error: 'Not allowed to change Opt-in Status.' }),
        });
      }

      const statsGetterConfig: StatsGetterConfig = {
        unencrypted: false,
      };

      const optInStatus = await telemetryCollectionManager.getOptInStats(
        newOptInStatus,
        statsGetterConfig
      );

      if (config.sendUsageFrom === 'server') {
        const optInStatusUrl = config.optInStatusUrl;
        sendTelemetryOptInStatus(
          telemetryCollectionManager,
          { optInStatusUrl, newOptInStatus, currentKibanaVersion },
          statsGetterConfig
        ).catch((err) => {
          // The server is likely behind a firewall and can't reach the remote service
          logger.warn(
            `Failed to notify "${optInStatusUrl}" from the server about the opt-in selection. Possibly blocked by a firewall? - Error: ${err.message}`
          );
        });
      }

      try {
        await updateTelemetrySavedObject(context.core.savedObjects.client, attributes);
      } catch (e) {
        if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
          return res.forbidden();
        }
      }
      return res.ok({ body: optInStatus });
    }
  );
}
