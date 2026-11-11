/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { TimeseriesPageObjects } from '../fixtures/page_objects';
import {
  cleanupTsvbSpace,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';

/**
 * The switch is only read when the editor boots, so every test opens the editor
 * itself — after it has set `metrics:allowStringIndices` to the value it needs.
 */
const openPanelOptions = async (pageObjects: TimeseriesPageObjects) => {
  await openTimeSeriesEditor(pageObjects);
  await pageObjects.visualBuilder.clickPanelOptions('timeSeries');
};

spaceTest.describe(
  'TSVB Time Series - data view selection mode',
  { tag: testData.TSVB_DEPLOYMENT_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupTsvbSpace(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(testData.ALLOW_STRING_INDICES_SETTING);
      await cleanupTsvbSpace(scoutSpace);
    });

    spaceTest(
      'disables the switch while string indices are not allowed',
      async ({ pageObjects, scoutSpace }) => {
        const { visualBuilder } = pageObjects;

        await scoutSpace.uiSettings.unset(testData.ALLOW_STRING_INDICES_SETTING);
        await openPanelOptions(pageObjects);

        await visualBuilder.openIndexPatternSelectionModePopover();
        await expect(visualBuilder.indexPatternSelectionModeSwitch).toBeDisabled();
      }
    );

    spaceTest(
      'leaves the switch enabled while string indices are allowed',
      async ({ pageObjects, scoutSpace }) => {
        const { visualBuilder } = pageObjects;

        await scoutSpace.uiSettings.set({ [testData.ALLOW_STRING_INDICES_SETTING]: true });
        await openPanelOptions(pageObjects);

        await visualBuilder.switchIndexPatternSelectionMode(true);

        await visualBuilder.openIndexPatternSelectionModePopover();
        await expect(visualBuilder.indexPatternSelectionModeSwitch).toBeEnabled();
      }
    );

    spaceTest(
      'disables the switch again once string indices are no longer allowed',
      async ({ page, pageObjects, scoutSpace }) => {
        const { visualBuilder } = pageObjects;

        await scoutSpace.uiSettings.set({ [testData.ALLOW_STRING_INDICES_SETTING]: true });
        await openPanelOptions(pageObjects);
        await visualBuilder.switchIndexPatternSelectionMode(false);

        await scoutSpace.uiSettings.set({ [testData.ALLOW_STRING_INDICES_SETTING]: false });
        // Advanced settings are only read while the page boots; the editor state itself
        // survives the reload because it is kept in the URL.
        await page.reload();
        await visualBuilder.waitForEditorLoaded();
        await visualBuilder.clickPanelOptions('timeSeries');

        await spaceTest.step('string indices mode can always be switched', async () => {
          await visualBuilder.openIndexPatternSelectionModePopover();
          await expect(visualBuilder.indexPatternSelectionModeSwitch).toBeEnabled();
        });

        await spaceTest.step('Kibana data views mode locks the switch', async () => {
          await visualBuilder.switchIndexPatternSelectionMode(true);
          await visualBuilder.openIndexPatternSelectionModePopover();
          await expect(visualBuilder.indexPatternSelectionModeSwitch).toBeDisabled();
        });
      }
    );
  }
);
