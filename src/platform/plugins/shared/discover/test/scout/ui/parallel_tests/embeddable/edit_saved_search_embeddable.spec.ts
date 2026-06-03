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

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import { testData } from '../../fixtures/common';

spaceTest.describe(
  'Discover saved search panel edit flow',
  { tag: testData.DISCOVER_CORE_TAGS },
  () => {
    const panelName = 'Rendering Test: saved search';
    const editingTitle = 'Rendering Test: saved search';
    const savedAsTitle = 'Rendering Test: saved as search';

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
      await pageObjects.discover.setQueryMode('classic');
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
        await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('14,004 documents');
        await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await page.getByTestId('discoverEmbeddableInlineEditEditInDiscoverLink').click();
        await pageObjects.discover.waitForDocTableRendered();
        const header = page.getByTestId('headerGlobalNav');
        await expect(
          header.locator(testSubjSelector('> breadcrumbs > ~breadcrumb & ~first'))
        ).toHaveText('Dashboards');
        await expect(header.locator(testSubjSelector('breadcrumb last'))).toHaveText(
          `Editing ${editingTitle}`
        );

        await pageObjects.discover.saveSearch(panelName);
        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.getByTestId('embeddableError')).toHaveCount(0);
        await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('14,004 documents');
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
        const header = page.getByTestId('headerGlobalNav');
        await expect(
          header.locator(testSubjSelector('> breadcrumbs > ~breadcrumb & ~first'))
        ).toHaveText('Dashboards');
        await expect(header.locator(testSubjSelector('breadcrumb last'))).toHaveText(
          `Editing ${editingTitle}`
        );
        await page.testSubj.click('discoverSaveButton');
        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.getByTestId('embeddableError')).toHaveCount(0);
        await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('14,004 documents');
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

        const header = page.getByTestId('headerGlobalNav');
        await expect(
          header.locator(testSubjSelector('> breadcrumbs > ~breadcrumb & ~first'))
        ).toHaveText('Discover');
        await expect(header.locator(testSubjSelector('breadcrumb last'))).toHaveText(savedAsTitle);
      }
    );
  }
);
