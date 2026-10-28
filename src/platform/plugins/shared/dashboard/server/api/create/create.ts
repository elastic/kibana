/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { getDashboardCRUResponseBody } from '../get_cru_response_body';
import { transformDashboardIn } from '../transforms';
import type { DashboardWriteScope } from '../write_scope';
import type { DashboardCreateResponseBody } from './types';
import {
  addToHistory,
  getHistorySnapshot,
  getNextHistorySequence,
  INITIAL_HISTORY_SEQUENCE,
} from '../../change_history/utils';

export interface CreateOptions {
  id?: string;
  serverTiming?: RequestTiming;
  isDashboardAppRequest?: boolean;
}

export async function create(
  { savedObjectsClient, supportsAccessControl, user, spaceId }: DashboardWriteScope,
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>,
  createBody: DashboardState,
  { id, serverTiming, isDashboardAppRequest = false }: CreateOptions = {}
): Promise<DashboardCreateResponseBody> {
  const { access_control: accessControl, ...restOfData } = createBody;

  const { attributes: soAttributes, references: soReferences } = transformDashboardIn(
    restOfData,
    isDashboardAppRequest,
    serverTiming
  );

  // a recreated ID may still have history from a deleted dashboard, so continue from it
  const historySequence = id
    ? await getNextHistorySequence({ spaceId, dashboardId: id, currentSequence: undefined })
    : INITIAL_HISTORY_SEQUENCE;

  const savedObject = await savedObjectsClient.create(
    DASHBOARD_SAVED_OBJECT_TYPE,
    { ...soAttributes, historySequence },
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
  // Rebuilt from stored attributes, not createBody: restore replays snapshots in dashboard-app format,
  // and panel IDs are only generated on the way in.
  const snapshot = getHistorySnapshot({
    dashboardId: savedObject.id,
    attributes: soAttributes,
    references: soReferences,
    strictValidationSchema,
  });
  if (snapshot) {
    await addToHistory({
      user,
      dashboardId: savedObject.id,
      snapshot,
      spaceId,
      sequence: historySequence,
      timestamp: savedObject.updated_at ?? new Date(Date.now()).toISOString(),
      type: 'create',
    });
  }

  return getDashboardCRUResponseBody(
    savedObject,
    'create',
    strictValidationSchema,
    isDashboardAppRequest,
    serverTiming
  );
}
