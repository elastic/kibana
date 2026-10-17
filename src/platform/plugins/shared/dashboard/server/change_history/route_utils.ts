/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  RouteMethod,
} from '@kbn/core/server';

import { getChangeHistoryClient } from './change_history_service';
import { getLatestHistorySequence } from './util';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { securityService, spacesService } from '../kibana_services';

export const CHANGE_HISTORY_ROUTE_SECURITY = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

/**
 * Checks the dashboard "all" privilege and access to the target dashboard saved object, then resolves the change history client and space for a
 * request, along with the saved dashboard's current history sequence. Returns the error response to send when the request cannot be served.
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
  try {
    await core.savedObjects.client.get<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      dashboardId
    );
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) return { error: res.notFound() };
    if (SavedObjectsErrorHelpers.isForbiddenError(e)) return { error: res.forbidden() };
    throw e;
  }

  let client;
  try {
    client = getChangeHistoryClient();
  } catch {
    return {
      error: res.customError({ statusCode: 503, body: 'Change history service is not ready' }),
    };
  }
  // the dashboard exists, so its latest version is the current one
  const currentSequence = await getLatestHistorySequence({ spaceId, dashboardId });
  return { client, spaceId, currentSequence };
};
