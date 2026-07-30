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

spaceTest.describe('search with scripted fields', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/kibana_scripted_fields_on_logstash'
    );
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.setDefaultTime({
      from: '2015-09-18T19:37:13.000Z',
      to: '2015-09-23T02:30:09.000Z',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should show incomplete results callout when a scripted field errors',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.selectDataView('logsta*');
      await expect(page.testSubj.locator('searchResponseWarningsEmptyPrompt')).toBeVisible();
    }
  );

  spaceTest(
    'should show incomplete results warning badge on a dashboard panel',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.selectDataView('logsta*');
      await pageObjects.discover.saveSearch('search with warning');

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addSavedSearch('search with warning');
      await expect(page.testSubj.locator('searchResponseWarningsBadgeToogleButton')).toBeVisible();
    }
  );

  spaceTest(
    'should return results without errors for a query with a valid scripted field',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.selectDataView('logstash-*');
      await pageObjects.queryBar.setQuery('php* OR *jpg OR *css*');
      await pageObjects.discover.submitQuery();
      await expect(page.testSubj.locator('searchResponseWarningsEmptyPrompt')).toBeHidden();
      await expect.poll(() => pageObjects.discover.getHitCountInt()).toBeGreaterThan(13000);
    }
  );
});
