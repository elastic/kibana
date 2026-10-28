/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { AccessControlClient } from '@kbn/content-management-access-control-public';
import type { DashboardUser } from '../dashboard_api/types';

/**
 * Shared access-control flags for a dashboard instance.
 * Prefer this over inlining `checkUserAccessControl` + global privilege checks.
 */
export const getDashboardAccessControlState = ({
  accessControlClient,
  accessControl,
  createdBy,
  user,
}: {
  accessControlClient: AccessControlClient;
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
  user?: Pick<DashboardUser, 'uid' | 'hasGlobalAccessControlPrivilege'>;
}): {
  isInEditAccessMode: boolean;
  canManageAccessControl: boolean;
  canEditDashboard: boolean;
} => {
  const isInEditAccessMode = accessControlClient.isInEditAccessMode(accessControl);
  const canManageAccessControl =
    Boolean(user?.hasGlobalAccessControlPrivilege) ||
    accessControlClient.checkUserAccessControl({
      accessControl,
      createdBy,
      userId: user?.uid,
    });

  return {
    isInEditAccessMode,
    canManageAccessControl,
    canEditDashboard: isInEditAccessMode || canManageAccessControl,
  };
};
