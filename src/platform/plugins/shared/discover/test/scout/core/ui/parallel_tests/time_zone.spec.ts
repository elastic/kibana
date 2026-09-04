/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Document timestamps follow `dateFormat:tz`.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe('time zone', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await discoverScoutSpace.uiSettings.set({ 'dateFormat:tz': 'America/Phoenix' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('dateFormat:tz');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'shifts the newest document timestamp after switching time zone',
    async ({ pageObjects }) => {
      const { datePicker, discover, queryBar } = pageObjects;

      await datePicker.setAbsoluteRange({
        from: 'Sep 19, 2015 @ 06:31:44.000',
        to: 'Sep 23, 2015 @ 18:31:44.000',
      });
      await discover.waitUntilTabIsLoaded();
      await queryBar.clearQuery();
      await discover.waitUntilTabIsLoaded();

      // Phoenix is UTC-7 relative to the UTC timestamp in the default-range test.
      expect(await discover.getDocTableIndex(1)).toContain('Sep 22, 2015 @ 16:50:13.253');
    }
  );
});
