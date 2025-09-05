/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
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
  isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean;
}

export class AccessControlClient implements AccessControlClientPublic {
  constructor(
    private readonly deps: {
      http: HttpStart;
      contentTypeId: string;
    }
  ) {}

  async checkGlobalPrivilege(): Promise<CheckGlobalPrivilegeResponse> {
    const response = await this.deps.http.get<CheckGlobalPrivilegeResponse>(
      `/internal/access_control/check_global_access_control_privilege`,
      {
        query: { contentTypeId: this.deps.contentTypeId },
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

  checkUserAccessControl({
    accessControl,
    createdBy,
    uid,
  }: CheckUserAccessControlParameters): boolean {
    if (!uid) {
      return false;
    }

    if (!accessControl?.owner) {
      // New saved object
      if (!createdBy) {
        return true;
      }
      return uid === createdBy;
    }

    return uid === accessControl.owner;
  }

  isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean {
    return (
      !accessControl ||
      accessControl.accessMode === undefined ||
      accessControl.accessMode === 'default'
    );
  }

  async canManageAccessControl({
    accessControl,
    createdBy,
    uid,
  }: CheckUserAccessControlParameters) {
    const { isGloballyAuthorized } = await this.checkGlobalPrivilege();
    const canManage = this.checkUserAccessControl({
      accessControl,
      createdBy,
      uid,
    });
    return isGloballyAuthorized || canManage;
  }
}
