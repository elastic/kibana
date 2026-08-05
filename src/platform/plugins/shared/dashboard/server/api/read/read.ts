/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestTiming } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { getDashboardCRUResponseBody } from '../get_cru_response_body';
import type { DashboardReadResponseBody } from './types';

export async function read(
  savedObjectsClient: SavedObjectsClientContract,
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>,
  id: string,
  useGASchemas: boolean,
  serverTiming?: RequestTiming,
  isDashboardAppRequest: boolean = false
): Promise<{ body: DashboardReadResponseBody; resolveHeaders: Record<string, string> }> {
  const {
    saved_object: savedObject,
    outcome,
    alias_purpose,
    alias_target_id,
  } = await savedObjectsClient.resolve<DashboardSavedObjectAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    id
  );

  const resolveHeaders: Record<string, string> = {
    'kbn-resolve-outcome': outcome,
  };
  if (alias_target_id) {
    resolveHeaders['kbn-resolve-alias-target-id'] = alias_target_id;
  }
  if (alias_purpose) {
    resolveHeaders['kbn-resolve-purpose'] = alias_purpose;
  }

  return {
    body: getDashboardCRUResponseBody(
      savedObject,
      'read',
      strictValidationSchema,
      isDashboardAppRequest,
      serverTiming,
      useGASchemas
    ),
    resolveHeaders,
  };
}
