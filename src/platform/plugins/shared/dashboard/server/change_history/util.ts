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

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { getChangeHistoryClient } from './change_history_service';

export const addToHistory = async ({
  ctx,
  spaceId = 'default',
  dashboardId,
  snapshot,
  timestamp,
  sequence,
  restoredFrom,
}: {
  ctx: RequestHandlerContext;
  spaceId: string | undefined;
  dashboardId: string;
  snapshot: DashboardState;
  timestamp: string;
  sequence: { previous?: number; current: number };
  restoredFrom?: number;
}) => {
  const core = await ctx.core;
  const user = core.security.authc.getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  let client;
  try {
    client = getChangeHistoryClient();
  } catch {
    return;
  }

  if (sequence.previous === sequence.current) return; // content is unchanged: no new version

  const change: ObjectChange = {
    objectType: 'dashboard',
    objectId: dashboardId,
    sequence: sequence.current,
    snapshot, // post-change state
  };

  try {
    const {
      items: [previous],
    } = await client.getHistory(spaceId, 'dashboard', dashboardId, {
      size: 1,
    });
    // stored with the event so that listing history does not need to diff every snapshot
    const changeCount = previous
      ? jsonpatchFormatter.format(jsondiffpatch.diff(previous.object.snapshot, snapshot)).length
      : undefined;

    await client.log(change, {
      action: 'dashboard_update',
      username: user.username,
      userProfileId: user.profile_uid,
      spaceId,
      data: {
        metadata: {
          ...(changeCount !== undefined && { changeCount }),
          ...(typeof restoredFrom === 'number' && { restoredFrom }),
        },
      },
      refresh: restoredFrom ? 'wait_for' : undefined, // wait for ES to update so that we fetch the updated list
    });
  } catch {
    // history is best-effort; a failed write must not fail the save
  }
};
