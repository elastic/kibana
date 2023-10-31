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
import { RequestHandlerContext, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  StatsGetterConfig,
  TelemetryCollectionManagerPluginSetup,
} from '@kbn/telemetry-collection-manager-plugin/server';
import { RequestHandler } from '@kbn/core-http-server';
import { OptInRoute } from '../../common/routes';
import { OptInBody, v2 } from '../../common/types';
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
  const v2Handler: RequestHandler<undefined, undefined, OptInBody, RequestHandlerContext> = async (
    context,
    req,
    res
  ) => {
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
      const { appendServerlessChannelsSuffix, sendUsageTo } = config;
      sendTelemetryOptInStatus(
        telemetryCollectionManager,
        { appendServerlessChannelsSuffix, sendUsageTo, newOptInStatus, currentKibanaVersion },
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

    const body: v2.OptInResponse = optInStatus;
    return res.ok({ body });
  };

  const v2Validations = {
    request: { body: schema.object({ enabled: schema.boolean() }) },
    response: {
      200: {
        body: schema.arrayOf(
          schema.object({ clusterUuid: schema.string(), stats: schema.string() })
        ),
      },
    },
  };

  router.versioned
    .post({ access: 'internal', path: OptInRoute })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion({ version: '1', validate: v2Validations }, v2Handler)
    .addVersion({ version: '2', validate: v2Validations }, v2Handler);
}
