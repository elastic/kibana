/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { RequestHandler } from '@kbn/core-http-server';
import { RequestHandlerContext } from '@kbn/core/server';
import { UserHasSeenNoticeRoute } from '../../common/routes';
import { TELEMETRY_SAVED_OBJECT_TYPE } from '../saved_objects';
import { v2 } from '../../common/types';
import {
  type TelemetrySavedObjectAttributes,
  getTelemetrySavedObject,
  updateTelemetrySavedObject,
} from '../saved_objects';

export function registerTelemetryUserHasSeenNotice(router: IRouter, currentKibanaVersion: string) {
  const v2Handler: RequestHandler<undefined, undefined, undefined, RequestHandlerContext> = async (
    context,
    req,
    res
  ) => {
    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [TELEMETRY_SAVED_OBJECT_TYPE],
    });
    const telemetrySavedObject = await getTelemetrySavedObject(soClient);

    // update the object with a flag stating that the opt-in notice has been seen
    const updatedAttributes: TelemetrySavedObjectAttributes = {
      ...telemetrySavedObject,
      userHasSeenNotice: true,
      // We need to store that the user was notified in this version.
      // Otherwise, it'll continuously show the banner if previously opted-out.
      lastVersionChecked: currentKibanaVersion,
    };
    await updateTelemetrySavedObject(soClient, updatedAttributes);

    const body: v2.Telemetry = {
      allowChangingOptInStatus: updatedAttributes.allowChangingOptInStatus,
      enabled: updatedAttributes.enabled,
      lastReported: updatedAttributes.lastReported,
      lastVersionChecked: updatedAttributes.lastVersionChecked,
      reportFailureCount: updatedAttributes.reportFailureCount,
      reportFailureVersion: updatedAttributes.reportFailureVersion,
      sendUsageFrom: updatedAttributes.sendUsageFrom,
      userHasSeenNotice: updatedAttributes.userHasSeenNotice,
    };
    return res.ok({ body });
  };

  router.versioned
    .put({ access: 'internal', path: UserHasSeenNoticeRoute })
    // Just because it used to be /v2/, we are creating identical v1 and v2.
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      v2Handler
    )
    .addVersion(
      {
        version: '2',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      v2Handler
    );
}
