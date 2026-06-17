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
  CanManageContentControlParameters,
  ChangeAccesModeParameters,
  ChangeAccessModeResponse,
  CheckGlobalPrivilegeResponse,
  CheckUserAccessControlParameters,
  IsAccessControlEnabledResponse,
} from './types';

export interface AccessControlClientPublic {
  checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse>;
  changeAccessMode({
    objects,
    accessMode,
  }: ChangeAccesModeParameters): Promise<ChangeAccessModeResponse>;
  canManageAccessControl(params: CanManageContentControlParameters): Promise<boolean>;
  checkUserAccessControl(params: CheckUserAccessControlParameters): boolean;
  isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean;
  isAccessControlEnabled(): Promise<boolean>;
}

export class AccessControlClient implements AccessControlClientPublic {
  constructor(
    private readonly deps: {
      http: HttpStart;
    }
  ) {}

  async checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse> {
    const response = await this.deps.http.get<CheckGlobalPrivilegeResponse>(
      `/internal/access_control/global_access/${contentTypeId}`
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

  async canManageAccessControl({
    accessControl,
    createdBy,
    userId,
    contentTypeId,
  }: CanManageContentControlParameters): Promise<boolean> {
    const { isGloballyAuthorized } = await this.checkGlobalPrivilege(contentTypeId);
    const canManage = this.checkUserAccessControl({
      accessControl,
      createdBy,
      userId,
    });
    return isGloballyAuthorized || canManage;
  }

  checkUserAccessControl({
    accessControl,
    createdBy,
    userId,
  }: CheckUserAccessControlParameters): boolean {
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

  isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean {
    return (
      !accessControl ||
      accessControl.accessMode === undefined ||
      accessControl.accessMode === 'default'
    );
  }

  async isAccessControlEnabled(): Promise<boolean> {
    const response = await this.deps.http.get<IsAccessControlEnabledResponse>(
      '/internal/access_control/is_enabled'
    );

    return response?.isAccessControlEnabled ?? false;
  }
}
