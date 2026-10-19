/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as jsondiffpatch from 'jsondiffpatch';
import * as jsonpatchFormatter from 'jsondiffpatch/formatters/jsonpatch';

import type { ObjectChange } from '@kbn/change-history';
import type { RequestHandlerContext } from '@kbn/core/server';

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { transformDashboardOut } from '../api/transforms';
import { getChangeHistoryClient } from './change_history_service';
import { INITIAL_HISTORY_SEQUENCE } from './history_sequence';

/**
 * Builds the snapshot to record in history from the stored attributes, always in the dashboard-app
 * panel format. Restoring always treats the snapshot as a dashboard-app request, so snapshots must
 * not depend on which API (public as-code or dashboard-app) performed the save. Returns undefined
 * if the snapshot cannot be built, since history is best-effort.
 */
export const getHistorySnapshot = ({
  attributes,
  references,
  strictValidationSchema,
}: {
  attributes: DashboardSavedObjectAttributes;
  references: SavedObjectReference[];
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>;
}): DashboardState | undefined => {
  try {
    const { dashboardState } = transformDashboardOut(
      attributes,
      references,
      true,
      strictValidationSchema
    );
    return dashboardState;
  } catch {
    return undefined;
  }
};

/**
 * Sequences of the dashboard's change history, which is the only source of version numbers: nothing
 * is stored on the saved object, and history outlives it (deleting a dashboard does not delete its
 * history). `latest` is undefined when there is no history or it cannot be read. `next` continues
 * after the latest version, which keeps new versions ordered above existing ones, including those
 * of a deleted dashboard with the same ID.
 */
export const getHistorySequences = async ({
  spaceId = 'default',
  dashboardId,
}: {
  spaceId: string | undefined;
  dashboardId: string;
}): Promise<{ latest: number | undefined; next: number }> => {
  let latest: number | undefined;
  try {
    const {
      items: [latestItem],
    } = await getChangeHistoryClient().getHistory(spaceId, 'dashboard', dashboardId, { size: 1 });
    const latestSequence = latestItem?.object.sequence;
    latest = typeof latestSequence === 'number' ? latestSequence : undefined;
  } catch {
    latest = undefined;
  }
  return { latest, next: latest === undefined ? INITIAL_HISTORY_SEQUENCE : latest + 1 };
};

/**
 * The sequence of the next version of a dashboard. A dashboard that stores its history sequence
 * continues from it, which is atomic with the save. Otherwise (a new dashboard, or one saved before the
 * sequence was stored) it continues from the history, which outlives the saved object.
 */
export const getNextHistorySequence = async ({
  spaceId,
  dashboardId,
  currentSequence,
}: {
  spaceId: string | undefined;
  dashboardId: string;
  currentSequence: number | undefined;
}): Promise<number> =>
  typeof currentSequence === 'number'
    ? currentSequence + 1
    : (await getHistorySequences({ spaceId, dashboardId })).next;

export const addToHistory = async ({
  ctx,
  spaceId = 'default',
  dashboardId,
  snapshot,
  previousSnapshot,
  timestamp,
  sequence,
  restoredFrom,
  type = 'update',
}: {
  ctx: RequestHandlerContext;
  spaceId: string | undefined;
  dashboardId: string;
  snapshot: DashboardState;
  /** Pre-change state the change count is computed against; omitted when there is no predecessor (e.g. create). */
  previousSnapshot?: DashboardState;
  timestamp: string;
  sequence: number;
  restoredFrom?: number;
  type?: 'update' | 'create' | 'delete';
}) => {
  const core = await ctx.core;
  // getCurrentUser() returns null when security is disabled; attribute those changes to the system actor
  const user = core.security.authc.getCurrentUser();
  let client;
  try {
    client = getChangeHistoryClient();
  } catch {
    return;
  }

  const change: ObjectChange = {
    objectType: 'dashboard',
    objectId: dashboardId,
    sequence,
    timestamp,
    snapshot, // post-change state
  };

  try {
    // Diffed against the saved object read before the update rather than the latest history event:
    // history is searchable only after a refresh, so consecutive saves could otherwise be compared
    // with an older version or with none. Stored with the event so that listing history does not
    // need to diff every snapshot.
    const changeCount = previousSnapshot
      ? jsonpatchFormatter.format(jsondiffpatch.diff(previousSnapshot, snapshot)).length
      : undefined;

    await client.log(change, {
      action: `dashboard_${type}`,
      username: user?.username ?? '', // if no user, record without actor
      userProfileId: user?.profile_uid,
      spaceId,
      data: {
        metadata: {
          ...(changeCount !== undefined && { changeCount }),
          ...(typeof restoredFrom === 'number' && { restoredFrom }),
        },
      },
      // wait for ES to update so that we fetch the updated list; a delete must also be visible before its ID is recreated
      refresh: restoredFrom || type === 'delete' ? 'wait_for' : undefined,
    });
  } catch {
    // history is best-effort; a failed write must not fail the save
  }
};
