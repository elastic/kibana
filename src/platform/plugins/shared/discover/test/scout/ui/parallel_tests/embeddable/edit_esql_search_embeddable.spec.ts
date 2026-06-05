/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover saved search embeddable edit flow behaviours.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover ES|QL panel edit flow', { tag: tags.deploymentAgnostic }, () => {
  const panelName = 'ES|QL Discover Session';
  const savedAsTitle = 'ES|QL Discover Session Saved As';

  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DASHBOARDS_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover'
    );
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.setQueryMode('esql');
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:rowHeightOption'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'can edit a linked session and return to the dashboard',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.addSavedSearch(panelName);
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('1,000 results');
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await page.getByTestId('discoverEmbeddableInlineEditEditInDiscoverLink').click();
      await pageObjects.discover.waitForDocTableRendered();

      expect(await page.getByText('Save and return').count()).toBeGreaterThan(0);

      await pageObjects.discover.saveSearch(panelName);
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('embeddableError')).toHaveCount(0);
      await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('1,000 results');
    }
  );

  spaceTest(
    'can edit a by-value session and return to the dashboard',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.addSavedSearch(panelName);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.unlinkFromLibrary();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await pageObjects.discover.waitForDocTableRendered();

      expect(await page.getByText('Save and return').count()).toBeGreaterThan(0);

      await page.testSubj.click('discoverSaveButton');
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('embeddableError')).toHaveCount(0);
      await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('1,000 results');
    }
  );

  spaceTest(
    'switches to Discover mode if search is saved as new',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.addSavedSearch(panelName);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await page.getByTestId('discoverEmbeddableInlineEditEditInDiscoverLink').click();
      await pageObjects.discover.waitForDocTableRendered();
      await pageObjects.discover.saveAsSearch(savedAsTitle);
      await pageObjects.discover.waitForDocTableRendered();

      expect(await page.getByText('Discover').count()).toBeGreaterThan(0);
      expect(await page.getByText(savedAsTitle).count()).toBeGreaterThan(0);
    }
  );
});
