/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable } from 'rxjs';
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
      const config = await firstValueFrom(config$);
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
        const { sendUsageTo } = config;
        sendTelemetryOptInStatus(
          telemetryCollectionManager,
          { sendUsageTo, newOptInStatus, currentKibanaVersion },
          statsGetterConfig
        ).catch((err) => {
          // The server is likely behind a firewall and can't reach the remote service
          logger.warn(
            `Failed to notify the telemetry endpoint about the opt-in selection. Possibly blocked by a firewall? - Error: ${err.message}`
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
