/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  CLASSIC_NAV_DEPLOYMENTS,
  ROOT_PROFILE_DEFAULT_ESQL_QUERY,
} from '../fixtures';

/**
 * `example-root-profile` supplies a `getDefaultEsqlQuery` accessor. Discover only asks for it when
 * ES|QL is the mode a session opens in, so the query has to be asserted on a page load that
 * already resolved to ES|QL rather than on an in-page mode switch.
 */
spaceTest.describe(
  'Discover context awareness - extension getDefaultEsqlQuery',
  { tag: CLASSIC_NAV_DEPLOYMENTS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'applies the root profile default query when ES|QL mode is the default',
      async ({ pageObjects }) => {
        const { discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getCurrentQueryMode()).toBe('classic');

        // Reopening Discover with ES|QL persisted as the mode is what triggers the accessor.
        await discover.goto({ queryMode: 'esql' });
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getCurrentQueryMode()).toBe('esql');

        expect(await discover.getEsqlQueryValue()).toBe(ROOT_PROFILE_DEFAULT_ESQL_QUERY);
      }
    );
  }
);
