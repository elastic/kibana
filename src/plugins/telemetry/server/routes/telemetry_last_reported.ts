/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectsClient } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { RequestHandler } from '@kbn/core-http-server';
import { LastReportedRoute } from '../../common/routes';
import { v2 } from '../../common/types';
import { getTelemetrySavedObject, updateTelemetrySavedObject } from '../saved_objects';

export function registerTelemetryLastReported(
  router: IRouter,
  savedObjectsInternalClient$: Observable<SavedObjectsClient>
) {
  // GET to retrieve
  const v2GetValidations = {
    response: { 200: { body: schema.object({ lastReported: schema.maybe(schema.number()) }) } },
  };

  const v2GetHandler: RequestHandler = async (context, req, res) => {
    const savedObjectsInternalClient = await firstValueFrom(savedObjectsInternalClient$);
    const telemetrySavedObject = await getTelemetrySavedObject(savedObjectsInternalClient);

    const body: v2.FetchLastReportedResponse = {
      lastReported: telemetrySavedObject && telemetrySavedObject?.lastReported,
    };
    return res.ok({ body });
  };

  router.versioned
    .get({ access: 'internal', path: LastReportedRoute })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion({ version: '1', validate: v2GetValidations }, v2GetHandler)
    .addVersion({ version: '2', validate: v2GetValidations }, v2GetHandler);

  // PUT to update
  const v2PutHandler: RequestHandler = async (context, req, res) => {
    const savedObjectsInternalClient = await firstValueFrom(savedObjectsInternalClient$);
    await updateTelemetrySavedObject(savedObjectsInternalClient, {
      lastReported: Date.now(),
    });
    return res.ok();
  };

  router.versioned
    .put({ access: 'internal', path: LastReportedRoute })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion({ version: '1', validate: false }, v2PutHandler)
    .addVersion({ version: '2', validate: false }, v2PutHandler);
}
