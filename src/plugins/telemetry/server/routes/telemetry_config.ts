/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Observable, firstValueFrom } from 'rxjs';
import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { RequestHandler } from '@kbn/core-http-server';
import { labelsSchema } from '../config/telemetry_labels';
import type { TelemetryConfigType } from '../config';
import { v2 } from '../../common/types';
import {
  FetchTelemetryConfigRoutePathBasedV2,
  FetchTelemetryConfigRoute,
} from '../../common/routes';
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
  const v2Handler: RequestHandler = async (context, req, res) => {
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

    const body: v2.FetchTelemetryConfigResponse = {
      allowChangingOptInStatus,
      optIn,
      sendUsageFrom,
      telemetryNotifyUserAboutOptInDefault,
      labels: config.labels,
    };

    return res.ok({ body });
  };

  const v2Validations = {
    response: {
      200: {
        body: schema.object({
          allowChangingOptInStatus: schema.boolean(),
          optIn: schema.oneOf([schema.boolean(), schema.literal(null)]),
          sendUsageFrom: schema.oneOf([schema.literal('server'), schema.literal('browser')]),
          telemetryNotifyUserAboutOptInDefault: schema.boolean(),
          // Declare the `serverless` label as optional in both offerings while we fix https://github.com/elastic/kibana/issues/167862
          labels: labelsSchema.extends({ serverless: schema.maybe(schema.string()) }),
        }),
      },
    },
  };

  // Register the internal versioned API
  router.versioned
    .get({
      access: 'internal',
      path: FetchTelemetryConfigRoute,
      options: { authRequired: 'optional' },
    })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion({ version: '1', validate: v2Validations }, v2Handler)
    .addVersion({ version: '2', validate: v2Validations }, v2Handler);

  // Register the deprecated public and path-based for BWC
  // as we know this one is used by other Elastic products to fetch the opt-in status.
  router.versioned
    .get({ access: 'public', path: FetchTelemetryConfigRoutePathBasedV2 })
    .addVersion({ version: '2023-10-31', validate: v2Validations }, v2Handler);
}
