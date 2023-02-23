/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Observable, firstValueFrom } from 'rxjs';
import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import type { TelemetryConfigType } from '../config';
import { FetchTelemetryConfigResponse, FetchTelemetryConfigRoute } from '../../common/routes';
import { getTelemetrySavedObject } from '../saved_objects';
import {
  getNotifyUserAboutOptInDefault,
  getTelemetryAllowChangingOptInStatus,
  getTelemetryOptIn,
  getTelemetrySendUsageFrom,
} from '../telemetry_config';

interface RegisterTelemetryConfigRouteOptions {
  router: IRouter;
  config$: Observable<TelemetryConfigType>;
  currentKibanaVersion: string;
  savedObjectsInternalClient$: Observable<SavedObjectsClient>;
}
export function registerTelemetryConfigRoutes({
  router,
  config$,
  currentKibanaVersion,
  savedObjectsInternalClient$,
}: RegisterTelemetryConfigRouteOptions) {
  // GET to retrieve
  router.get(
    {
      path: FetchTelemetryConfigRoute,
      validate: false,
    },
    async (context, req, res) => {
      const config = await firstValueFrom(config$);
      const savedObjectsInternalClient = await firstValueFrom(savedObjectsInternalClient$);
      const telemetrySavedObject = await getTelemetrySavedObject(savedObjectsInternalClient);
      const allowChangingOptInStatus = getTelemetryAllowChangingOptInStatus({
        configTelemetryAllowChangingOptInStatus: config.allowChangingOptInStatus,
        telemetrySavedObject,
      });

      const optIn = getTelemetryOptIn({
        configTelemetryOptIn: config.optIn,
        allowChangingOptInStatus,
        telemetrySavedObject,
        currentKibanaVersion,
      });

      const sendUsageFrom = getTelemetrySendUsageFrom({
        configTelemetrySendUsageFrom: config.sendUsageFrom,
        telemetrySavedObject,
      });

      const telemetryNotifyUserAboutOptInDefault = getNotifyUserAboutOptInDefault({
        telemetrySavedObject,
        allowChangingOptInStatus,
        configTelemetryOptIn: config.optIn,
        telemetryOptedIn: optIn,
      });

      const body: FetchTelemetryConfigResponse = {
        allowChangingOptInStatus,
        optIn,
        sendUsageFrom,
        telemetryNotifyUserAboutOptInDefault,
      };

      return res.ok({ body });
    }
  );
}
