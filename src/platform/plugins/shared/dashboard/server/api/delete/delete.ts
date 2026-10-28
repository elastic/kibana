/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardOut } from '../transforms';
import type { DashboardWriteScope } from '../write_scope';
import type { DashboardDeleteResponseBody } from './types';
import {
  addToHistory,
  getHistorySnapshot,
  getNextHistorySequence,
} from '../../change_history/utils';

export async function deleteDashboard(
  { savedObjectsClient, user, spaceId }: DashboardWriteScope,
  id: string,
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>
): Promise<DashboardDeleteResponseBody> {
  const savedObject = await savedObjectsClient.get<DashboardSavedObjectAttributes>('dashboard', id);
  const {
    dashboardState: { title, tags },
  } = transformDashboardOut(
    savedObject.attributes,
    savedObject.references,
    undefined,
    strictValidationSchema
  );
  await savedObjectsClient.delete(DASHBOARD_SAVED_OBJECT_TYPE, id);
  const deletedAt = new Date().toISOString(); // SO client does not provide deletedAt timestamp, so this is the next-best thing

  const snapshot = getHistorySnapshot({
    dashboardId: id,
    attributes: savedObject.attributes,
    references: savedObject.references,
    strictValidationSchema,
  });
  if (snapshot) {
    const sequence = await getNextHistorySequence({
      spaceId,
      dashboardId: id,
      currentSequence: savedObject.attributes.historySequence,
    });
    await addToHistory({
      user,
      dashboardId: id,
      snapshot,
      spaceId,
      sequence,
      timestamp: deletedAt,
      type: 'delete',
    });
  }

  return { id, data: { title: title ?? '', tags: tags ?? [] } };
}
