/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';

import { getChangeHistoryClient } from './change_history_service';
import { spacesService } from '../kibana_services';

export const CHANGE_HISTORY_ROUTE_SECURITY = {
  authz: {
    enabled: false,
    reason: 'This route delegates authorization to the scoped ES client',
  },
} as const;

/**
 * Checks dashboard edit privileges and resolves the change history client and space for a
 * request. Returns the error response to send when the request cannot be served.
 */
export const getChangeHistoryContext = async <P, Q, B>(
  ctx: RequestHandlerContext,
  req: KibanaRequest<P, Q, B, 'get'>,
  res: KibanaResponseFactory
) => {
  const core = await ctx.core;
  const { has_all_requested: hasAllPrivileges } =
    await core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
      application: [
        {
          application: 'kibana-.kibana',
          resources: ['*'],
          privileges: ['feature_dashboard_v2.edit'],
        },
      ],
    });
  if (!hasAllPrivileges) return { error: res.forbidden() };

  let client;
  try {
    client = getChangeHistoryClient();
  } catch {
    return {
      error: res.customError({ statusCode: 503, body: 'Change history service is not ready' }),
    };
  }
  return { client, spaceId: spacesService?.getSpaceId(req) ?? 'default' };
};
