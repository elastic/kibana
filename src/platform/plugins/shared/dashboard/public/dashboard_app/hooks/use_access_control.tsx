/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { getAccessControlClient } from '../access_control/get_access_control_client';
import { CONTENT_ID } from '../../../common/content_management';

interface UseAccessControl {
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
}

export const useAccessControl = ({ accessControl, createdBy }: UseAccessControl) => {
  const [canManageAccessControl, setCanManageAccessControl] = useState(false);
  const [isInEditAccessMode, setIsInEditAccessMode] = useState(false);

  useEffect(() => {
    const checkUserPrivileges = async () => {
      const accessControlClient = getAccessControlClient();
      const { isGloballyAuthorized } = await accessControlClient.checkGlobalPrivilege(CONTENT_ID);
      const canManage = accessControlClient.checkUserAccessControl({
        accessControl,
        createdBy,
      });
      setCanManageAccessControl(isGloballyAuthorized || canManage);

      const isInEditMode = accessControlClient.isInEditAccessMode(accessControl);
      setIsInEditAccessMode(isInEditMode);
    };

    checkUserPrivileges();
  }, [createdBy, accessControl]);

  return {
    canManageAccessControl,
    isInEditAccessMode,
  };
};
