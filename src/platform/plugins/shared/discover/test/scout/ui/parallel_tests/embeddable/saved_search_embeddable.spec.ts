/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover saved search embeddable behaviours.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const addSearchEmbeddableToDashboard = async (
  page: ScoutPage,
  objects: PageObjects,
  title = 'Rendering Test: saved search'
) => {
  await objects.dashboard.addSavedSearch(title);
  await objects.dashboard.waitForRenderComplete();
  expect(page.getByTestId('docTable').locator('.euiDataGridRowCell')).toBeTruthy();
};

spaceTest.describe('Discover saved search embeddable', { tag: testData.DISCOVER_CORE_TAGS }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DASHBOARDS_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged user is needed to save the search used by the embeddable test.
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

  spaceTest('should control columns correctly', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);

    const timestamp = page
      .getByTestId('dataGridRowCell')
      .filter({ hasText: 'Sep 22, 2015 @ 23:50:13.253' });

    expect(await timestamp.count()).toBeGreaterThan(0);
    const colNum = await timestamp.getAttribute('data-gridcell-column-index');
    expect(colNum).not.toBeNull();

    await page.getByTestId('dataGridHeaderCell-agent').focus();
    await page.getByTestId('dataGridHeaderCellActionButton-agent').click();
    await page.getByText('Move left').click();

    await expect(timestamp).not.toHaveAttribute('data-gridcell-column-index', colNum!);

    await page.getByTestId('dataGridHeaderCell-agent').focus();
    await page.getByTestId('dataGridHeaderCellActionButton-agent').click();
    await page.getByText('Remove column').click();

    await expect(timestamp).toHaveAttribute('data-gridcell-column-index', colNum!);
  });

  spaceTest('should render duplicate saved search embeddables', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    await addSearchEmbeddableToDashboard(page, pageObjects);
    const docTables = page.getByTestId('docTable');
    await expect(docTables).toHaveCount(2);

    // We are specifically getting the first & last items here to compare against each other.
    // eslint-disable-next-line playwright/no-nth-methods
    const first = await docTables.first().getByRole('gridcell').allInnerTexts();
    // eslint-disable-next-line playwright/no-nth-methods
    const last = await docTables.last().getByRole('gridcell').allInnerTexts();
    expect(first).toStrictEqual(last);
  });

  spaceTest('should not show the full screen button', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    await expect(page.getByTestId('dataGridFullScreenButton')).toHaveCount(0);
  });

  spaceTest('should show the the grid toolbar', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    await expect(page.getByTestId('unifiedDataTableToolbar')).toHaveCount(1);
  });

  spaceTest('should display an error', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    await pageObjects.queryBar.setQuery('bytes > 5000');
    await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('14,004 documents');
    await pageObjects.queryBar.setQuery('this < is not : a valid > query');
    await pageObjects.queryBar.submitQuery();
    await pageObjects.dashboard.waitForRenderComplete();
    await expect(page.getByTestId('errorMessageMarkdown')).toHaveText(
      /Expected[\S\s]+but "n" found/
    );
  });

  spaceTest('should display search highlights', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    await pageObjects.queryBar.setQuery('Mozilla');
    await pageObjects.queryBar.submitQuery();
    await pageObjects.dashboard.waitForRenderComplete();
    const marks = await page.locator('.unifiedDataTable__cellValue mark').allInnerTexts();
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((mark) => mark === 'Mozilla')).toBe(true);
  });

  spaceTest(
    'should expand the detail row when the toggle arrow is clicked',
    async ({ page, pageObjects }) => {
      await addSearchEmbeddableToDashboard(page, pageObjects);
      // There are many toggles, we need to pick one/any to click. The first one
      // is good enough.
      // eslint-disable-next-line playwright/no-nth-methods
      await page.getByTestId('docTableExpandToggleColumn').first().click();
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('kbnDocViewer')).toBeVisible();
    }
  );

  spaceTest('filters are added when a cell filter is clicked', async ({ page, pageObjects }) => {
    await addSearchEmbeddableToDashboard(page, pageObjects);
    // There are many gridcells, we need to pick one/any to click. The fourth one
    // is good enough, and replicates the old test.
    // eslint-disable-next-line playwright/no-nth-methods
    await page.getByRole('gridcell').nth(4).click();
    await pageObjects.dashboard.waitForRenderComplete();
    await page.getByTestId('filterOutButton').click();
    await pageObjects.dashboard.waitForRenderComplete();
    await expect(page.testSubj.locator('~filter')).toHaveCount(1);
    // There are many gridcells, we need to pick one/any to click. The fourth one
    // is good enough, and replicates the old test.
    // eslint-disable-next-line playwright/no-nth-methods
    await page.getByRole('gridcell').nth(4).click();
    await pageObjects.dashboard.waitForRenderComplete();
    await page.getByTestId('filterForButton').click();
    await pageObjects.dashboard.waitForRenderComplete();
    await expect(page.testSubj.locator('~filter')).toHaveCount(2);
  });

  spaceTest(
    'can cancel a By Value edit and return to the dashboard',
    async ({ page, pageObjects }) => {
      await addSearchEmbeddableToDashboard(page, pageObjects);

      await pageObjects.dashboard.unlinkFromLibrary();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await pageObjects.discover.waitForDocTableRendered();
      await pageObjects.discover.writeAndSubmitKqlQuery('test');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      expect(await pageObjects.discover.getHitCountInt()).toBe(22);
      await page.getByTestId('discoverSaveButton-secondary-button').click();
      await page.getByTestId('discoverCancelButton').click();
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('embeddableError')).toHaveCount(0);
      await expect(page.getByTestId('savedSearchTotalDocuments')).toHaveText('14,004 documents');
    }
  );

  spaceTest(
    'can edit a by-value session without it affective the reference session',
    async ({ page, pageObjects }) => {
      await addSearchEmbeddableToDashboard(page, pageObjects);

      await pageObjects.dashboard.unlinkFromLibrary();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await pageObjects.discover.writeAndSubmitKqlQuery('test');
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await page.getByTestId('discoverSaveButton').click();
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(page.getByTestId('embeddableError')).toHaveCount(0);
      await addSearchEmbeddableToDashboard(page, pageObjects);
      expect(await page.getByTestId('savedSearchTotalDocuments').allInnerTexts()).toStrictEqual([
        '22 documents',
        '14,004 documents',
      ]);
    }
  );

  spaceTest(
    'resets back to a normal Discover session if navigated away from an edit session',
    async ({ page, pageObjects }) => {
      await addSearchEmbeddableToDashboard(page, pageObjects);

      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await page.getByTestId('discoverEmbeddableInlineEditEditInDiscoverLink').click();
      await pageObjects.discover.waitForDocTableRendered();

      expect(await page.getByText('Save and return').count()).toBeGreaterThan(0);
      await expect(page.getByTestId('unifiedTabs_tabsBar')).toBeInViewport();

      await page.reload();
      await pageObjects.discover.waitForDocTableRendered();

      await expect(page.getByText('Save and return')).toHaveCount(0);
    }
  );
});
