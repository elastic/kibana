/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dashboard embeddable rendering of data-grid field-type token icons.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

const SAVED_SEARCH_WITH_COLUMNS = 'With columns';

spaceTest.describe(
  'Discover data grid field tokens - dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      // Saving a search + creating a dashboard requires write access.
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.setQueryMode('classic');
      await pageObjects.discover.goto();
      await pageObjects.dataGrid.waitUntilSearchingHasFinished();
      await pageObjects.dataGrid.waitForDocTableRendered();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('renders field tokens for a saved search panel', async ({ pageObjects }) => {
      const { dashboard, dataGrid, discover } = pageObjects;

      await spaceTest.step('save a search with selected columns', async () => {
        await dataGrid.addFieldFromSidebar('bytes');
        await dataGrid.addFieldFromSidebar('extension');
        await dataGrid.addFieldFromSidebar('geo.coordinates');
        await dataGrid.addFieldFromSidebar('relatedContent.article:modified_time');
        await discover.saveSearch(SAVED_SEARCH_WITH_COLUMNS);
      });

      await spaceTest.step('add the saved search to a new dashboard', async () => {
        await dashboard.openNewDashboard();
        await dashboard.addPanelFromLibrary(SAVED_SEARCH_WITH_COLUMNS);
        await dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify the rendered field tokens', async () => {
        await expect
          .poll(() => dataGrid.getDataGridHeaderFieldTokens())
          .toStrictEqual(['Number', 'Text', 'Geo point', 'Date']);

        await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
        await expect
          .poll(() => dataGrid.getDocViewerFieldTokens())
          .toStrictEqual([
            'Keyword',
            'Keyword',
            'Keyword',
            'Number',
            'Text',
            'Text',
            'Date',
            'Text',
            'Number',
            'IP address',
          ]);
      });
    });
  }
);
