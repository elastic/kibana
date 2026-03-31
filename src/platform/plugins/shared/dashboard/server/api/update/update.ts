/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardUpdateRequestBody, DashboardUpdateResponseBody } from './types';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../saved_object_utils';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';

export async function update(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  id: string,
  updateBody: DashboardUpdateRequestBody,
  isDashboardAppRequest: boolean = false,
  serverTiming?: RequestTiming
): Promise<DashboardUpdateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const { access_control: accessControl, ...restOfData } = updateBody;

  const transformInTimer = serverTiming?.start('transform-dashboard-in');
  const {
    attributes: soAttributes,
    references: soReferences,
    error: transformInError,
  } = transformDashboardIn(restOfData, isDashboardAppRequest);
  if (transformInError) {
    throw Boom.badRequest(`Invalid data. ${transformInError.message}`);
  }
  transformInTimer?.end();

  const savedObjectTimer = serverTiming?.start('update-saved-object');
  const savedObject = await core.savedObjects.client.update<DashboardSavedObjectAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    id,
    soAttributes,
    {
      references: soReferences,
      /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
      mergeAttributes: false,
    }
  );
  savedObjectTimer?.end();

  const transformOutTimer = serverTiming?.start('transform-dashboard-out');
  const response = getDashboardCRUResponseBody(
    savedObject,
    'update',
    dashboardStateSchema,
    isDashboardAppRequest
  );
  transformOutTimer?.end();

  return response;
}
