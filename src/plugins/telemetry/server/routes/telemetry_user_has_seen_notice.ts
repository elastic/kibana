/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core/server';
import { TELEMETRY_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  type TelemetrySavedObjectAttributes,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../saved_objects';

export function registerTelemetryUserHasSeenNotice(router: IRouter) {
  router.put(
    {
      path: '/api/telemetry/v2/userHasSeenNotice',
      validate: false,
    },
    async (context, req, res) => {
      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [TELEMETRY_SAVED_OBJECT_TYPE],
      });
      const telemetrySavedObject = await getTelemetrySavedObject(soClient);

      // update the object with a flag stating that the opt-in notice has been seen
      const updatedAttributes: TelemetrySavedObjectAttributes = {
        ...telemetrySavedObject,
        userHasSeenNotice: true,
      };
      await updateTelemetrySavedObject(soClient, updatedAttributes);

      return res.ok({ body: updatedAttributes });
    }
  );
}
