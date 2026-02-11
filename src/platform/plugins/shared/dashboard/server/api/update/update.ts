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
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardUpdateRequestBody, DashboardUpdateResponseBody } from './types';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../saved_object_utils';

export async function update(
  requestCtx: RequestHandlerContext,
  id: string,
  updateBody: DashboardUpdateRequestBody
): Promise<DashboardUpdateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const { access_control: accessControl, ...restOfData } = updateBody.data;

  const {
    attributes: soAttributes,
    references: soReferences,
    error: transformInError,
  } = transformDashboardIn(restOfData);
  if (transformInError) {
    throw Boom.badRequest(`Invalid data. ${transformInError.message}`);
  }

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

  return getDashboardCRUResponseBody(savedObject, 'update');
}
