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

export const useAccessControl = (accessControl?: AccessControl) => {
  const [isCurrentUserAuthor, setIsCurrentUserAuthor] = useState(false);
  const [isInEditAccessMode, setIsInEditAccessMode] = useState(false);

  // TODO: Possibly add project/cluster admin check here
  useEffect(() => {
    setIsInEditAccessMode(
      !accessControl ||
        accessControl.accessMode === undefined ||
        accessControl.accessMode === 'default'
    );

    coreServices.security.authc.getCurrentUser().then((user) => {
      const isAuthor = user?.profile_uid === accessControl?.owner;
      setIsCurrentUserAuthor(isAuthor);
    });
  }, [accessControl]);

  return {
    isCurrentUserAuthor,
    isInEditAccessMode,
  };
};
