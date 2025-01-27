/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BrowserAuthFixture, LoginFunction } from '.';
import { PROJECT_DEFAULT_ROLES } from '../../../../common';
import { coreWorkerFixtures } from '../../worker';
import { ScoutSpaceParallelFixture } from '../../worker/scout_space';

/**
 * The "browserAuth" fixture simplifies the process of logging into Kibana with
 * different roles during tests. It uses the "samlAuth" fixture to create an authentication session
 * for the specified role and the "context" fixture to update the cookie with the role-scoped session.
 */
export const browserAuthParallelFixture = coreWorkerFixtures.extend<
  { browserAuth: BrowserAuthFixture },
  { scoutSpace: ScoutSpaceParallelFixture }
>({
  browserAuth: async ({ log, context, samlAuth, config, scoutSpace }, use) => {
    const setSessionCookie = async (cookieValue: string) => {
      await context.clearCookies();
      await context.addCookies([
        {
          name: 'sid',
          value: cookieValue,
          path: '/',
          domain: 'localhost',
        },
      ]);
    };

    const loginAs: LoginFunction = async (role) => {
      const spaceId = scoutSpace.id;
      const cookie = await samlAuth.getInteractiveUserSessionCookieWithRoleScope(role, { spaceId });
      await setSessionCookie(cookie);
    };

    const loginAsAdmin = () => loginAs('admin');
    const loginAsViewer = () => loginAs('viewer');
    const loginAsPrivilegedUser = () => {
      const roleName = config.serverless
        ? PROJECT_DEFAULT_ROLES.get(config.projectType!)!
        : 'editor';
      return loginAs(roleName);
    };

    log.serviceLoaded(`browserAuth:${scoutSpace.id}`);
    await use({ loginAsAdmin, loginAsViewer, loginAsPrivilegedUser });
  },
});
