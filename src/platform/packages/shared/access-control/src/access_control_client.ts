/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { AuthenticatedUser, CoreAuthenticationService } from '@kbn/core/public';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type {
  ChangeAccesModeParameters,
  ChangeAccessModeResponse,
  CheckGlobalPrivilegeResponse,
  CheckUserAccessControlParameters,
} from './types';

export interface AccessControlClientPublic {
  checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse>;
  changeAccessMode({
    objects,
    accessMode,
  }: ChangeAccesModeParameters): Promise<ChangeAccessModeResponse>;
  checkUserAccessControl(params: CheckUserAccessControlParameters): boolean;
  isDashboardInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean;
}

export class AccessControlClient implements AccessControlClientPublic {
  private user: AuthenticatedUser | null = null;

  constructor(private readonly deps: { http: HttpStart; coreAuth: CoreAuthenticationService }) {
    this.deps.coreAuth.getCurrentUser()?.then((user) => {
      this.user = user;
    });
  }

  async checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse> {
    const response = await this.deps.http.get<CheckGlobalPrivilegeResponse>(
      `/internal/access_control/check_global_access_control_privilege`,
      {
        query: { contentTypeId },
      }
    );

    return {
      isGloballyAuthorized: response?.isGloballyAuthorized,
    };
  }

  async changeAccessMode({
    objects,
    accessMode,
  }: ChangeAccesModeParameters): Promise<ChangeAccessModeResponse> {
    const { result } = await this.deps.http.post<ChangeAccessModeResponse>(
      `/internal/access_control/change_access_mode`,
      {
        body: JSON.stringify({ objects, accessMode }),
      }
    );

    return {
      result,
    };
  }

  checkUserAccessControl({ accessControl, createdBy }: CheckUserAccessControlParameters): boolean {
    const userId = this.user?.profile_uid;

    if (!userId) {
      return false;
    }

    if (!accessControl?.owner) {
      // New saved object
      if (!createdBy) {
        return true;
      }
      return userId === createdBy;
    }

    return userId === accessControl.owner;
  }

  isDashboardInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean {
    return (
      !accessControl ||
      accessControl.accessMode === undefined ||
      accessControl.accessMode === 'default'
    );
  }
}
