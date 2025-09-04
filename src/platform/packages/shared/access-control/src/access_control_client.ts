/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type {
  ChangeAccesModeParams,
  ChangeAccessModeResponse,
  CheckGlobalPrivilegeResponse,
} from './types';

export interface AccessControlClientPublic {
  checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse>;
  changeAccessMode({
    objects,
    accessMode,
  }: ChangeAccesModeParams): Promise<ChangeAccessModeResponse>;
}

export class AccessControlClient implements AccessControlClientPublic {
  constructor(private readonly deps: { http: HttpStart }) {}

  async checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse> {
    const response = await this.deps.http.get<CheckGlobalPrivilegeResponse>(
      `/internal/access_control/check_global_access_control_privilege`,
      {
        query: { contentTypeId },
      }
    );

    return {
      isGloballyAuthorized: response.isGloballyAuthorized,
    };
  }

  async changeAccessMode({
    objects,
    accessMode,
  }: ChangeAccesModeParams): Promise<ChangeAccessModeResponse> {
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
}
