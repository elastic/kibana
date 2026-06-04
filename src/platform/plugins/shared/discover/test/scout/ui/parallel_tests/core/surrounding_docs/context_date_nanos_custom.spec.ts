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

const TEST_DEFAULT_CONTEXT_SIZE = 1;
const TEST_STEP_SIZE = 3;

spaceTest.describe(
  'Discover context - date_nanos custom timestamp',
  { tag: testData.CONTEXT_STATEFUL_TAGS },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_DATE_NANOS_CUSTOM);
      dataViewId =
        imported.find(
          (so: { title: string }) => so.title === testData.DATE_NANOS_CUSTOM_INDEX_PATTERN
        )?.id ?? testData.DATE_NANOS_CUSTOM_INDEX_PATTERN;
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATE_NANOS_CUSTOM_INDEX_PATTERN);
      await scoutSpace.uiSettings.set({
        'context:defaultSize': String(TEST_DEFAULT_CONTEXT_SIZE),
        'context:step': String(TEST_STEP_SIZE),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'context:defaultSize', 'context:step');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'displays predecessors - anchor - successors in right order',
      async ({ pageObjects }) => {
        await pageObjects.contextPage.navigateTo(dataViewId, '1');

        const rows = await pageObjects.contextPage.getRowsText(true);
        const expectedTimestamps = [
          'Oct 21, 2019 @ 08:30:04.828733000',
          'Oct 21, 2019 @ 00:30:04.828740000',
          'Oct 21, 2019 @ 00:30:04.828723000',
        ];

        expect(rows).toHaveLength(expectedTimestamps.length);
        for (let i = 0; i < expectedTimestamps.length; i++) {
          expect.soft(rows[i]).toContain(expectedTimestamps[i]);
        }
      }
    );
  }
);
