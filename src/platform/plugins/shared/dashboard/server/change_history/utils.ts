/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import * as jsondiffpatch from 'jsondiffpatch';
import * as jsonpatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import { omit } from 'lodash';

import type { ObjectChange } from '@kbn/change-history';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  RouteMethod,
} from '@kbn/core/server';

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { transformDashboardOut } from '../api/transforms';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { logger, securityService, spacesService } from '../kibana_services';
import { getChangeHistoryClient } from './change_history_service';

export const INITIAL_HISTORY_SEQUENCE = 1;

/**
 * Whether the stored content (attributes or references, ignoring the history sequence) differs between two versions of a dashboard.
 */
export const hasContentChanged = (
  existing: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>,
  next: Pick<SavedObject<DashboardSavedObjectAttributes>, 'attributes' | 'references'>
): boolean =>
  // the history sequence is bookkeeping, not content
  !equal(omit(existing.attributes, 'historySequence'), omit(next.attributes, 'historySequence')) ||
  !equal(existing.references, next.references);

/**
 * Builds the snapshot to record in history from the stored attributes, always in the dashboard-app
 * panel format. Returns undefined if the snapshot cannot be built, since history is best-effort.
 */
export const getHistorySnapshot = ({
  dashboardId,
  attributes,
  references,
  strictValidationSchema,
}: {
  dashboardId: string;
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
  } catch (e) {
    logger.warn(
      `Unable to build change history snapshot for dashboard ${dashboardId}: ${e.message}`
    );
    return undefined;
  }
};

/**
 * Sequences of the dashboard's change history. Used when the saved object has no stored
 * `historySequence` (a new dashboard, or one saved before it was stored), and history outlives
 * the saved object (deleting a dashboard does not delete its history)
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
    } = await (
      await getChangeHistoryClient()
    ).getHistory(spaceId, 'dashboard', dashboardId, { size: 1 });
    const latestSequence = latestItem?.object.sequence;
    latest = typeof latestSequence === 'number' ? latestSequence : undefined;
  } catch (e) {
    logger.warn(
      `Unable to read change history sequence for dashboard ${dashboardId}: ${e.message}`
    );
    latest = undefined;
  }
  return { latest, next: latest === undefined ? INITIAL_HISTORY_SEQUENCE : latest + 1 };
};

/**
 * The sequence of the next version of a dashboard. A dashboard that stores its history sequence
 * continues from it; otherwise it continues from the history, which outlives the saved object.
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
    client = await getChangeHistoryClient();
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
    // Diffed against the pre-update saved object, not the latest history event, which may not be
    // searchable yet. Stored with the event so listing history doesn't need to diff every snapshot.
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
      // restores and deletes must be searchable immediately (listing, ID recreation)
      refresh: restoredFrom || type === 'delete' ? 'wait_for' : undefined,
    });
  } catch {
    // history is best-effort; a failed write must not fail the save
  }
};

export const CHANGE_HISTORY_ROUTE_SECURITY = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

/**
 * Checks the dashboard "all" privilege and access to the target dashboard saved object, then resolves the change history client and space for a
 * request, along with the saved dashboard's current history sequence (its stored `historySequence`).
 * Returns the error response to send when the request cannot be served.
 */
export const getChangeHistoryContext = async <P, Q, B, M extends RouteMethod>(
  ctx: RequestHandlerContext,
  req: KibanaRequest<P, Q, B, M>,
  res: KibanaResponseFactory,
  dashboardId: string
) => {
  const core = await ctx.core;
  const spaceId = spacesService?.getSpaceId(req) ?? 'default';
  // the privileges API is unavailable when Elasticsearch security is disabled; in that case, requests are not subject to RBAC
  const isRbacEnabled = securityService?.authz.mode.useRbacForRequest(req) ?? false;
  if (isRbacEnabled) {
    const { has_all_requested: hasAllPrivileges } =
      await core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
        application: [
          {
            application: 'kibana-.kibana',
            resources: [`space:${spaceId}`],
            privileges: ['feature_dashboard_v2.all'],
          },
        ],
      });
    if (!hasAllPrivileges) return { error: res.forbidden() };
  }

  // history is read with an internally privileged client, so access to the dashboard must be verified
  let storedSequence: number | undefined;
  try {
    const { attributes } = await core.savedObjects.client.get<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      dashboardId
    );
    storedSequence = attributes.historySequence;
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) return { error: res.notFound() };
    if (SavedObjectsErrorHelpers.isForbiddenError(e)) return { error: res.forbidden() };
    throw e;
  }

  let client;
  try {
    client = await getChangeHistoryClient();
  } catch {
    return {
      error: res.customError({ statusCode: 503, body: 'Change history service is not ready' }),
    };
  }
  // the saved object is the source of truth; dashboards saved before the sequence was stored fall back to history
  const currentSequence =
    typeof storedSequence === 'number'
      ? storedSequence
      : (await getHistorySequences({ spaceId, dashboardId })).latest;
  return { client, spaceId, currentSequence };
};
