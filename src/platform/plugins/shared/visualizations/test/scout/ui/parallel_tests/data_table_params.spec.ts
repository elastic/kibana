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
  'Visualize - data table - params, save/load and inspector',
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
      'applies/resets params, saves, loads, and shows correct data',
      async ({ pageObjects: { visualize, visEditor, inspector } }) => {
        const visName = 'Visualization DataTable';

        await spaceTest.step('build a bytes histogram data table', async () => {
          await visualize.createAggBasedVisualization(
            'table',
            testData.DATA_VIEW.LOGSTASH_TIME_BASED
          );
          await visEditor.clickBucket('Split rows');
          await visEditor.selectAggregation('Histogram');
          await visEditor.selectField('bytes');
          await visEditor.setInterval('2000', { type: 'numeric' });
          await visEditor.clickGo();
        });

        await spaceTest.step('allows applying changed params', async () => {
          await visEditor.setInterval('1', { type: 'numeric', append: true });
          expect(await visEditor.getNumericInterval()).toBe('20001');
          expect(await visEditor.isApplyEnabled()).toBe(true);
        });

        await spaceTest.step('allows resetting changed params', async () => {
          await visEditor.clickReset();
          expect(await visEditor.getNumericInterval()).toBe('2000');
        });

        await spaceTest.step('saves and loads the visualization', async () => {
          await visualize.saveVisualization(visName);
          await visualize.loadSavedVisualization(visName);
        });

        await spaceTest.step('has the inspector enabled', async () => {
          await expect(inspector.getOpenButton()).toBeEnabled();
        });

        await spaceTest.step('shows correct data in the inspector', async () => {
          await inspector.open();
          expect(await inspector.getTableData()).toStrictEqual(testData.BYTES_HISTOGRAM_TABLE);
          await inspector.close();
        });

        await spaceTest.step('shows correct data when partial rows is on', async () => {
          await visEditor.clickOptionsTab();
          await visEditor.checkSwitch('showPartialRows');
          await visEditor.clickGo();

          await inspector.open();
          expect(await inspector.getTableData()).toStrictEqual(testData.BYTES_HISTOGRAM_TABLE);
          await inspector.close();

          await visEditor.uncheckSwitch('showPartialRows');
        });
      }
    );
  }
);
