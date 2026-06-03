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

const TEST_DEFAULT_CONTEXT_SIZE = 2;
const TEST_STEP_SIZE = 2;

spaceTest.describe(
  'Discover context - size settings',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      dataViewId =
        imported.find((so: { title: string }) => so.title === testData.LOGSTASH_DATA_VIEW)?.id ??
        testData.LOGSTASH_DATA_VIEW;
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.set({
        'context:defaultSize': String(TEST_DEFAULT_CONTEXT_SIZE),
        'context:step': String(TEST_STEP_SIZE),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.contextPage.navigateTo(dataViewId, testData.LOGSTASH_ANCHOR_ID);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'context:defaultSize', 'context:step');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should default to the context:defaultSize setting',
      async ({ page, pageObjects }) => {
        const expectedRowCount = 2 * TEST_DEFAULT_CONTEXT_SIZE + 1;
        const rows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
        await expect(rows).toHaveCount(expectedRowCount, { timeout: 30_000 });

        const predecessorValue = await pageObjects.contextPage.getPredecessorCountPickerValue();
        expect(predecessorValue).toBe(String(TEST_DEFAULT_CONTEXT_SIZE));
      }
    );

    spaceTest(
      'should increase rows when clicking load newer button',
      async ({ page, pageObjects }) => {
        const initialExpected = 2 * TEST_DEFAULT_CONTEXT_SIZE + 1;
        const rows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
        await expect(rows).toHaveCount(initialExpected, { timeout: 30_000 });

        await pageObjects.contextPage.clickPredecessorLoadMoreButton();

        const expectedAfterLoad = initialExpected + TEST_STEP_SIZE;
        await expect(rows).toHaveCount(expectedAfterLoad, { timeout: 30_000 });
      }
    );

    spaceTest(
      'should increase rows when clicking load older button',
      async ({ page, pageObjects }) => {
        const initialExpected = 2 * TEST_DEFAULT_CONTEXT_SIZE + 1;
        const rows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
        await expect(rows).toHaveCount(initialExpected, { timeout: 30_000 });

        await pageObjects.contextPage.clickSuccessorLoadMoreButton();

        const expectedAfterLoad = initialExpected + TEST_STEP_SIZE;
        await expect(rows).toHaveCount(expectedAfterLoad, { timeout: 30_000 });
      }
    );

    spaceTest(
      'should show 101 records when 50 newer and 50 older are requested',
      async ({ pageObjects }) => {
        await pageObjects.contextPage.setPredecessorCount(50);
        await pageObjects.contextPage.setSuccessorCount(50);

        await expect
          .poll(async () => pageObjects.contextPage.getDocumentNumber(), {
            message: 'should display 101 documents',
            timeout: 30_000,
          })
          .toBe(101);
      }
    );
  }
);
