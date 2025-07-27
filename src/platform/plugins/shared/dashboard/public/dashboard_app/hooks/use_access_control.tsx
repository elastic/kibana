/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { AccessControl } from '../access_control';
import { coreServices } from '../../services/kibana_services';

interface UseAccessControl {
  accessControl?: AccessControl;
  createdBy: string;
}

export const useAccessControl = ({ accessControl, createdBy }: UseAccessControl) => {
  const [isCurrentUserAuthor, setIsCurrentUserAuthor] = useState(false);
  const [isInEditAccessMode, setIsInEditAccessMode] = useState(false);

  useEffect(() => {
    setIsInEditAccessMode(
      !accessControl ||
        accessControl.accessMode === undefined ||
        accessControl.accessMode === 'default'
    );

    coreServices.security.authc.getCurrentUser().then((user) => {
      const userId = user.profile_uid;
      /* TODO: Replace this with something a response from the server:
      const privileges = { kibana: actions.savedObject.get(type, 'manage_access_control')}; // your specific type ('dashboard' in this case)
      const { hasAllRequested } = await checkPrivilegesWithRequest(req).globally(privileges);
      */
      const isAdmin = user.roles.includes('superuser');

      if (!accessControl) {
        const isAuthor = userId === createdBy;
        setIsCurrentUserAuthor(isAdmin || isAuthor);
        return;
      }

      const isOwner = userId === accessControl.owner;
      setIsCurrentUserAuthor(isAdmin || isOwner);
    });
  }, [accessControl, createdBy]);

  return {
    isCurrentUserAuthor,
    isInEditAccessMode,
  };
};
