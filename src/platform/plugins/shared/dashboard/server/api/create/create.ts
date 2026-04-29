/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardCreateRequestBody } from './types';
import { transformDashboardIn } from '../transforms';
import { getDashboardCRUResponseBody } from '../get_cru_response_body';
import type { DashboardCreateResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { createDashboardSavedObject } from '../create_dashboard_saved_object';

export async function create(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  createBody: DashboardCreateRequestBody,
  isDashboardAppRequest: boolean = false
): Promise<DashboardCreateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const { access_control: accessControl, ...restOfData } = createBody;

  const { attributes: soAttributes, references: soReferences } = transformDashboardIn(
    restOfData,
    isDashboardAppRequest
  );

  const savedObject = await createDashboardSavedObject({
    savedObjectsClient: core.savedObjects.client,
    typeRegistry: core.savedObjects.typeRegistry,
    attributes: soAttributes,
    references: soReferences,
    accessMode: accessControl?.access_mode,
  });

  return getDashboardCRUResponseBody(
    savedObject,
    'create',
    dashboardStateSchema,
    isDashboardAppRequest
  );
}
