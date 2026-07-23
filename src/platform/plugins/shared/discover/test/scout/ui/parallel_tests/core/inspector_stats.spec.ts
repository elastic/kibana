/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';

spaceTest.describe('Discover inspector request stats', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('shows zero hits for a request with no results', async ({ page, pageObjects }) => {
    const inspector = new Inspector(page);

    await pageObjects.discover.writeAndSubmitKqlQuery('extension: "no-such-extension"');
    await pageObjects.discover.clickAppMenuItem('openInspectorButton');
    await inspector.openInspectorRequestsView();
    await inspector.openRequestsStatisticsTab();

    await expect(page.testSubj.locator('inspector.statistics.hits')).toHaveText('0');
    await inspector.close();
  });

  spaceTest('shows total hits for a request with results', async ({ page, pageObjects }) => {
    const inspector = new Inspector(page);

    await pageObjects.discover.clickAppMenuItem('openInspectorButton');
    await inspector.openInspectorRequestsView();
    await inspector.openRequestsStatisticsTab();

    await expect(page.testSubj.locator('inspector.statistics.hits')).toHaveText('500');
    await inspector.close();
  });
});
