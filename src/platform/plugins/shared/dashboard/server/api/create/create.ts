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
import type { DashboardCreateRequestBody } from './types';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../saved_object_utils';
import type { DashboardCreateResponseBody } from './types';

export async function create(
  requestCtx: RequestHandlerContext,
  createBody: DashboardCreateRequestBody
): Promise<DashboardCreateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const { access_control: accessControl, ...restOfData } = createBody.data;

  const {
    attributes: soAttributes,
    references: soReferences,
    error: transformInError,
  } = transformDashboardIn(restOfData);
  if (transformInError) {
    throw Boom.badRequest(`Invalid data. ${transformInError.message}`);
  }

  const supportsAccessControl = core.savedObjects.typeRegistry.supportsAccessControl(
    DASHBOARD_SAVED_OBJECT_TYPE
  );

  const savedObject = await core.savedObjects.client.create<DashboardSavedObjectAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    soAttributes,
    {
      references: soReferences,
      ...(createBody.id && { id: createBody.id }),
      ...(createBody.spaces && { initialNamespaces: createBody.spaces }),
      ...(accessControl?.access_mode &&
        supportsAccessControl && {
          accessControl: {
            accessMode: accessControl.access_mode ?? 'default',
          },
        }),
    }
  );

  return getDashboardCRUResponseBody(savedObject, 'create');
}
