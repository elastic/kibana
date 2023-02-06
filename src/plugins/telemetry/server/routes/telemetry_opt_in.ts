/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, type Observable } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  StatsGetterConfig,
  TelemetryCollectionManagerPluginSetup,
} from '@kbn/telemetry-collection-manager-plugin/server';
import { sendTelemetryOptInStatus } from './telemetry_opt_in_stats';
import {
  getTelemetrySavedObject,
  TELEMETRY_SAVED_OBJECT_TYPE,
  type TelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../saved_objects';

import { TelemetryConfigType } from '../config';
import { getTelemetryAllowChangingOptInStatus } from '../telemetry_config';

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
      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [TELEMETRY_SAVED_OBJECT_TYPE],
      });
      const attributes: TelemetrySavedObject = {
        enabled: newOptInStatus,
        lastVersionChecked: currentKibanaVersion,
      };
      const config = await firstValueFrom(config$);

      let telemetrySavedObject: TelemetrySavedObject | undefined;
      try {
        telemetrySavedObject = await getTelemetrySavedObject(soClient);
      } catch (err) {
        if (SavedObjectsErrorHelpers.isForbiddenError(err)) {
          // If we couldn't get the saved object due to lack of permissions,
          // we can assume the user won't be able to update it either
          return res.forbidden();
        }
      }

      const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
        configTelemetryAllowChangingOptInStatus: config.allowChangingOptInStatus,
        telemetrySavedObject,
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
        await updateTelemetrySavedObject(soClient, attributes);
      } catch (e) {
        if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
          return res.forbidden();
        }
      }
      return res.ok({ body: optInStatus });
    }
  );
}
