/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsChangeAccessControlResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';

export interface CheckGlobalPrivilegeResponse {
  isGloballyAuthorized: boolean;
}

export interface IsAccessControlEnabledResponse {
  isAccessControlEnabled: boolean;
}

export interface ChangeAccesModeParameters {
  objects: Array<{ type: string; id: string }>;
  accessMode: SavedObjectAccessControl['accessMode'];
}

export interface ChangeAccessModeResponse {
  result: SavedObjectsChangeAccessControlResponse;
}

export interface CheckUserAccessControlParameters {
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
  userId?: string;
}

export interface CanManageContentControlParameters extends CheckUserAccessControlParameters {
  contentTypeId: string;
}
