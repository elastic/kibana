/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { SavedObjectAccessControl } from '@kbn/core/server';
import { coreServices } from '../../services/kibana_services';
import { checkGlobalManageControlPrivilege } from '../access_control/check_global_manage_control_privilege';
import { getBulkAuthorNames } from '../access_control/get_bulk_author_names';
import { isDashboardInEditAccessMode } from '../access_control/is_dashboard_in_edit_access_mode';
import { checkUserAccessControl } from '../access_control/check_user_access_control';

interface UseAccessControl {
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
}

export const useAccessControl = ({ accessControl, createdBy }: UseAccessControl) => {
  const [canManageAccessControl, setCanManageAccessControl] = useState(false);
  const [isInEditAccessMode, setIsInEditAccessMode] = useState(false);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    const isInEditMode = isDashboardInEditAccessMode(accessControl);
    setIsInEditAccessMode(isInEditMode);
  }, [accessControl]);

  useEffect(() => {
    const checkUserPrivileges = async () => {
      const user = await coreServices.security.authc.getCurrentUser();
      const isGloballyAuthorized = await checkGlobalManageControlPrivilege();
      const canManage = checkUserAccessControl({
        accessControl,
        createdBy,
        userId: user.profile_uid,
      });
      setCanManageAccessControl(isGloballyAuthorized || canManage);
    };

    checkUserPrivileges();
  }, [createdBy, accessControl]);

  useEffect(() => {
    const getAuthorName = async () => {
      const author = await getBulkAuthorNames([accessControl?.owner || createdBy]);
      setAuthorName(author[0].username);
    };

    getAuthorName();
  }, [createdBy, accessControl?.owner]);

  return {
    canManageAccessControl,
    isInEditAccessMode,
    authorName,
  };
};
