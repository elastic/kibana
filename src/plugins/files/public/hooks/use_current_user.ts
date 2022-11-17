/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { AuthenticatedUser } from '@kbn/security-plugin/common/model';

import { FilesPlugin } from '../plugin';

export function useCurrentUser() {
  const [user, setUser] = useState<AuthenticatedUser>();

  useEffect(() => {
    const getUser = async () => {
      try {
        const authenticatedUser = await FilesPlugin.getSecurity()?.authc.getCurrentUser();
        setUser(authenticatedUser);
      } catch {
        setUser(undefined);
      }
    };

    getUser();
  }, []);

  return user;
}
