/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
// The `date-nested` index itself is loaded once by global.setup.ts, since it is shared.
import { DATE_NESTED_KBN_ARCHIVE } from '../../../common/ui/fixtures/constants';

spaceTest.describe(
  'Discover — nested date as time field',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      // Discover defaults give the test a data view to start from, so selecting `date-nested`
      // is a real switch rather than whatever the space happened to load first.
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(DATE_NESTED_KBN_ARCHIVE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'shows an error callout when the time field is a nested date',
      async ({ page, pageObjects }) => {
        // `createAdHocIfMissing: false`: the data view is loaded in `beforeAll`, so the
        // saved one must be picked. It also makes the switcher wait for the filtered option
        // to render rather than checking visibility right after the last keystroke and
        // falling through to ad hoc creation.
        await pageObjects.discover.selectDataView('date-nested', { createAdHocIfMissing: false });
        await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();
      }
    );
  }
);
