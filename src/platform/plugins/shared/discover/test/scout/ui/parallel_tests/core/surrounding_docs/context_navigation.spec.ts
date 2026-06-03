/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/surrounding_docs';

const TEST_FILTER_FIELD = 'extension';
const TEST_FILTER_VALUE = 'jpg';

spaceTest.describe(
  'Discover context - back navigation',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should go back after loading more in context view',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.filterBar.addFilter({
          field: TEST_FILTER_FIELD,
          operator: 'is',
          value: TEST_FILTER_VALUE,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        const initialHitCount = await pageObjects.discover.getHitCountInt();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await pageObjects.contextPage.clickSuccessorLoadMoreButton();
        await pageObjects.contextPage.clickSuccessorLoadMoreButton();
        await pageObjects.contextPage.clickSuccessorLoadMoreButton();

        await page.goBack();
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        const hitCount = await pageObjects.discover.getHitCountInt();
        expect(hitCount).toBe(initialHitCount);
      }
    );

    spaceTest(
      'should go back via breadcrumbs with preserved state',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.filterBar.addFilter({
          field: TEST_FILTER_FIELD,
          operator: 'is',
          value: TEST_FILTER_VALUE,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_FILTER_FIELD,
            value: TEST_FILTER_VALUE,
            enabled: true,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'should go back via breadcrumbs with preserved state after page refresh',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.filterBar.addFilter({
          field: TEST_FILTER_FIELD,
          operator: 'is',
          value: TEST_FILTER_VALUE,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.reload();
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_FILTER_FIELD,
            value: TEST_FILTER_VALUE,
            enabled: true,
          })
        ).toBe(true);
      }
    );

    spaceTest(
      'should preserve state when navigating back after URL state changes',
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginAsViewer();
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.discover.waitForDocTableRendered();

        await pageObjects.filterBar.addFilter({
          field: TEST_FILTER_FIELD,
          operator: 'is',
          value: TEST_FILTER_VALUE,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await pageObjects.discover.openDocumentDetails({ rowIndex: 0 });
        await pageObjects.contextPage.clickRowAction(1);
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        await page.testSubj.click('~breadcrumb & ~first');
        await pageObjects.discover.waitUntilSearchingHasFinished();

        expect(
          await pageObjects.filterBar.hasFilter({
            field: TEST_FILTER_FIELD,
            value: TEST_FILTER_VALUE,
            enabled: true,
          })
        ).toBe(true);
      }
    );
  }
);
