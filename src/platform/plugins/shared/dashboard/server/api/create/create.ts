/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { RequestTiming } from '@kbn/core-http-server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../get_cru_response_body';
import type { DashboardCreateResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardState } from '../types';

export async function create(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  createBody: DashboardState,
  serverTiming?: RequestTiming,
  isDashboardAppRequest: boolean = false,
  id?: string
): Promise<DashboardCreateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const { access_control: accessControl, ...restOfData } = createBody;

  const { attributes: soAttributes, references: soReferences } = transformDashboardIn(
    restOfData,
    isDashboardAppRequest,
    serverTiming
  );

  const supportsAccessControl = core.savedObjects.typeRegistry.supportsAccessControl(
    DASHBOARD_SAVED_OBJECT_TYPE
  );
  const savedObject = await core.savedObjects.client.create(
    DASHBOARD_SAVED_OBJECT_TYPE,
    soAttributes,
    {
      ...(id !== undefined && { id }),
      references: soReferences,
      ...(accessControl?.access_mode &&
        supportsAccessControl && {
          accessControl: {
            accessMode: accessControl.access_mode,
          },
        }),
    }
  );

  return getDashboardCRUResponseBody(
    savedObject,
    'create',
    dashboardStateSchema,
    isDashboardAppRequest,
    serverTiming
  );
}
