/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  loadVisualizeSuiteDefaults,
  cleanupVisualizeSuiteDefaults,
} from '../fixtures';

spaceTest.describe(
  'Visualize - data table - other bucket',
  { tag: ['@local-stateful-classic'] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await loadVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupVisualizeSuiteDefaults(scoutSpace);
    });

    spaceTest(
      'shows and filters the "Other" bucket',
      async ({ pageObjects: { visualize, visEditor, visChart, renderable } }) => {
        await spaceTest.step('build a terms table with other and missing buckets', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('extension.raw');
          await visEditor.setSize(2);
          await visEditor.clickGo();

          await visEditor.toggleOtherBucket();
          await visEditor.toggleMissingBucket();
          await visEditor.clickGo();
        });

        await spaceTest.step('shows correct data', async () => {
          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['jpg', '9,109'],
            ['css', '2,159'],
            ['Other', '2,736'],
          ]);
        });

        await spaceTest.step('applies the correct filter when clicking "Other"', async () => {
          await visChart.filterOnTableCell(0, 2);
          await renderable.waitForRender();

          expect(await visChart.getTableVisContent()).toStrictEqual([
            ['png', '1,373'],
            ['gif', '918'],
            ['Other', '445'],
          ]);
        });
      }
    );
  }
);
