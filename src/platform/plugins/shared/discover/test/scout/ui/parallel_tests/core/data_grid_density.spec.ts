/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover data-grid density selector: the default density, changing it, and
 * persistence across a page reload. These are read-only interactions, so they
 * run as the built-in viewer.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover data grid density', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('uses the default (Compact) density', async ({ pageObjects }) => {
    await pageObjects.discover.openGridDisplaySettings();

    expect(await pageObjects.discover.getCurrentDensityValue()).toBe('Compact');
  });

  spaceTest('allows changing the density', async ({ pageObjects }) => {
    await pageObjects.discover.openGridDisplaySettings();
    await pageObjects.discover.setDensityValue('Normal');

    // Re-open the popover (close + open) to confirm the selection sticks.
    await pageObjects.discover.openGridDisplaySettings();
    await pageObjects.discover.openGridDisplaySettings();
    expect(await pageObjects.discover.getCurrentDensityValue()).toBe('Normal');
  });

  spaceTest('persists the density selection after reloading', async ({ page, pageObjects }) => {
    await pageObjects.discover.openGridDisplaySettings();
    await pageObjects.discover.setDensityValue('Expanded');
    expect(await pageObjects.discover.getCurrentDensityValue()).toBe('Expanded');

    await page.reload();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();

    await pageObjects.discover.openGridDisplaySettings();
    expect(await pageObjects.discover.getCurrentDensityValue()).toBe('Expanded');
  });
});
