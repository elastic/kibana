/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AuthenticatedUser,
  KibanaRequest,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { coreServices, spacesService } from '../kibana_services';

export interface DashboardWriteScope {
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly supportsAccessControl: boolean;
  /** Null when security is disabled; history then records no actor. */
  readonly user: Pick<AuthenticatedUser, 'username' | 'profile_uid'> | null;
  readonly spaceId: string | undefined;
}

/** Builds the write scope in a route handler from the objects core put on its context. */
export const getWriteScopeFromContext = async (
  ctx: RequestHandlerContext,
  request: KibanaRequest
): Promise<DashboardWriteScope> => {
  const { core } = await ctx.resolve(['core']);
  return {
    savedObjectsClient: core.savedObjects.client,
    supportsAccessControl: core.savedObjects.typeRegistry.supportsAccessControl(
      DASHBOARD_SAVED_OBJECT_TYPE
    ),
    user: core.security.authc.getCurrentUser(),
    spaceId: spacesService?.getSpaceId(request),
  };
};

/** Builds the write scope from a request alone. */
export const getWriteScopeFromRequest = (request: KibanaRequest): DashboardWriteScope => ({
  savedObjectsClient: coreServices.savedObjects.getScopedClient(request),
  supportsAccessControl: coreServices.savedObjects
    .getTypeRegistry()
    .supportsAccessControl(DASHBOARD_SAVED_OBJECT_TYPE),
  user: coreServices.security.authc.getCurrentUser(request),
  spaceId: spacesService?.getSpaceId(request),
});
