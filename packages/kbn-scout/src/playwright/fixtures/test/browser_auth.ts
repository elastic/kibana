/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { PROJECT_DEFAULT_ROLES } from '../../../common';
import { LoginFixture, ScoutWorkerFixtures } from '../types';
import { serviceLoadedMsg } from '../../utils';

export const browserAuthFixture = base.extend<{ browserAuth: LoginFixture }, ScoutWorkerFixtures>({
  browserAuth: async ({ log, context, samlAuth, config }, use) => {
    const loginAs = async (role: string) => {
      await context.clearCookies();
      const cookie = await samlAuth.getInteractiveUserSessionCookieWithRoleScope(role);
      await context.addCookies([
        {
          name: 'sid',
          value: cookie,
          path: '/',
          domain: 'localhost',
        },
      ]);
    };
    const loginAsAdmin = () => loginAs('admin');
    const loginAsViewer = () => loginAs('viewer');
    const loginAsPrivilegedUser = async () => {
      const roleName = config.serverless
        ? PROJECT_DEFAULT_ROLES.get(config.projectType!)!
        : 'editor';
      return loginAs(roleName);
    };
    log.debug(serviceLoadedMsg('browserAuth'));
    use({ loginAsViewer, loginAsPrivilegedUser, loginAsAdmin });
  },
});
