/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Field-type token icons (`.kbnFieldIcon` aria-labels) rendered by the data grid:
 * none in the column header while only the `Document` summary column is shown,
 * the correct tokens once columns are selected (classic + ES|QL), and the doc
 * viewer flyout token list. All read-only, so these run as the built-in viewer.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

const CLASSIC_DOC_VIEWER_TOKENS = [
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
];

spaceTest.describe('Discover data grid field tokens', { tag: '@local-stateful-classic' }, () => {
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.dataGrid.waitUntilSearchingHasFinished();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'does not render header tokens when only the Document column is visible',
    async ({ pageObjects }) => {
      const { dataGrid, discover } = pageObjects;
      expect(await discover.getHitCountInt()).toBe(14004);

      // The summary `Document` column shows no field-type tokens in the header.
      await expect.poll(() => dataGrid.getDataGridHeaderFieldTokens()).toStrictEqual([]);

      await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
      await expect
        .poll(() => dataGrid.getDocViewerFieldTokens())
        .toStrictEqual(CLASSIC_DOC_VIEWER_TOKENS);
    }
  );

  spaceTest('renders header tokens for selected columns', async ({ pageObjects }) => {
    const { dataGrid } = pageObjects;
    await dataGrid.addFieldFromSidebar('bytes');
    await dataGrid.addFieldFromSidebar('extension');
    await dataGrid.addFieldFromSidebar('ip');
    await dataGrid.addFieldFromSidebar('geo.coordinates');

    await expect
      .poll(() => dataGrid.getDataGridHeaderFieldTokens())
      .toStrictEqual(['Number', 'Text', 'IP address', 'Geo point']);

    await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
    await expect
      .poll(() => dataGrid.getDocViewerFieldTokens())
      .toStrictEqual(CLASSIC_DOC_VIEWER_TOKENS);
  });

  spaceTest('renders field tokens correctly for ES|QL', async ({ pageObjects }) => {
    const { dataGrid, discover } = pageObjects;
    await discover.selectTextBaseLang();
    expect(await discover.getHitCountInt()).toBe(1000);

    await dataGrid.addFieldFromSidebar('@timestamp');
    await dataGrid.addFieldFromSidebar('bytes');
    await dataGrid.addFieldFromSidebar('extension');
    await dataGrid.addFieldFromSidebar('ip');
    await dataGrid.addFieldFromSidebar('geo.coordinates');

    await expect
      .poll(() => dataGrid.getDataGridHeaderFieldTokens())
      .toStrictEqual(['Number', 'Text', 'IP address', 'Geo point']);

    await dataGrid.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
    await expect
      .poll(() => dataGrid.getDocViewerFieldTokens())
      .toStrictEqual([
        'Text',
        'Keyword',
        'Text',
        'Keyword',
        'Date',
        'Text',
        'Keyword',
        'Number',
        'IP address',
        'Text',
      ]);
  });

  spaceTest('renders header tokens on the surrounding documents page', async ({ pageObjects }) => {
    const { dataGrid } = pageObjects;
    await dataGrid.addFieldFromSidebar('bytes');
    await dataGrid.addFieldFromSidebar('extension');

    await dataGrid.openSurroundingDocuments(0);

    await expect
      .poll(() => dataGrid.getDataGridHeaderFieldTokens())
      .toStrictEqual(['Number', 'Text']);
  });
});
