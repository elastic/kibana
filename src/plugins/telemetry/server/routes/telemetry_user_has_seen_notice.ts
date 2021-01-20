/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from 'kibana/server';
import {
  TelemetrySavedObject,
  TelemetrySavedObjectAttributes,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../telemetry_repository';

export function registerTelemetryUserHasSeenNotice(router: IRouter) {
  router.put(
    {
      path: '/api/telemetry/v2/userHasSeenNotice',
      validate: false,
    },
    async (context, req, res) => {
      const internalRepository = context.core.savedObjects.client;
      const telemetrySavedObject: TelemetrySavedObject = await getTelemetrySavedObject(
        internalRepository
      );

      // update the object with a flag stating that the opt-in notice has been seen
      const updatedAttributes: TelemetrySavedObjectAttributes = {
        ...telemetrySavedObject,
        userHasSeenNotice: true,
      };
      await updateTelemetrySavedObject(internalRepository, updatedAttributes);

      return res.ok({ body: updatedAttributes });
    }
  );
}
