/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';

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
    // return res.customError({ statusCode: 503, body: 'Change history service is not ready' });
  }

  const { items: previousHistoryItem } = await client.getHistory(
    spaceId,
    'dashboard',
    dashboardId,
    {
      size: 1,
    }
  );
  if (equal(previousHistoryItem[0]?.object.snapshot, snapshot)) return; // do not log new version if no changes

  const change: ObjectChange = {
    objectType: 'dashboard',
    objectId: dashboardId,
    ...(sequence.previous !== sequence.current ? { sequence: sequence.current } : {}),
    snapshot, // post-change state
  };

  try {
    await client.log(change, {
      action: 'dashboard_update',
      username: user.username,
      userProfileId: user.profile_uid,
      spaceId,
      ...(typeof restoredFrom === 'number' && { data: { metadata: { restoredFrom } } }),
      refresh: restoredFrom ? 'wait_for' : undefined, // wait for ES to update so that we fetch the updated list
    });
  } catch (e) {
    // console.log('!!!!!', { e });
  }

  // return res.ok();
};
