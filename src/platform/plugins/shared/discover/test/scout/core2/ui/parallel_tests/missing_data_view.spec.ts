/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '@kbn/as-code-discover-schema';
import { VIEW_MODE } from '../../../../../common/constants';
import { spaceTest, tags, testData } from '../fixtures';

// A data view ID that doesn't exist, like the ID of a data view deleted after saving the session
const DELETED_DATA_VIEW_ID = 'deleted-data-view-id';
// Not the default data view, which Discover falls back to on its own
const REPLACEMENT_DATA_VIEW = 'kibana_sample_data_flights';
const MISSING_TAB_LABEL = 'Missing data view';
const EXISTING_TAB_LABEL = 'Existing data view';

const createTab = (
  id: string,
  label: string,
  dataViewId: string
): DiscoverSessionApiDataInput['tabs'][number] => ({
  id,
  label,
  data_source: { type: 'data_view_reference', ref_id: dataViewId },
  column_order: [],
  sort: [],
  query: { language: 'kql', expression: '' },
  filters: [],
  view_mode: VIEW_MODE.DOCUMENT_LEVEL,
  hide_chart: false,
  hide_table: false,
});

spaceTest.describe(
  'Discover session with a missing data view',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'should let the user pick a replacement data view without blocking the other tabs',
      async ({ apiServices, browserAuth, discoverScoutSpace, page, pageObjects }) => {
        const sessionId = await apiServices.discover.create(
          {
            title: `Session with a missing data view ${discoverScoutSpace.id}`,
            tabs: [
              createTab('missing', MISSING_TAB_LABEL, DELETED_DATA_VIEW_ID),
              createTab(
                'existing',
                EXISTING_TAB_LABEL,
                discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW)
              ),
            ],
          },
          discoverScoutSpace.id
        );
        const missingDataViewPrompt = page.testSubj.locator('discoverMissingDataViewPrompt');
        const pickReplacementDataView = async () => {
          await page.testSubj.click('discoverMissingDataViewPicker');
          await page.testSubj
            .locator('indexPattern-switcher')
            .locator(`[data-test-subj="dataView-${REPLACEMENT_DATA_VIEW}"]`)
            .click();
          await pageObjects.discover.waitUntilTabIsLoaded();
        };

        await spaceTest.step('open the session on the tab with the missing data view', async () => {
          await browserAuth.loginAsPrivilegedUser();
          // Like `pageObjects.discover.goto`, but the tab renders the prompt instead of `dscPage`
          await pageObjects.discover.setQueryMode('classic');
          await page.gotoApp('discover', {
            hash: `/view/${sessionId}`,
            readyWhen: missingDataViewPrompt,
            readyTimeout: 45_000,
          });
          await expect(missingDataViewPrompt).toContainText(DELETED_DATA_VIEW_ID);
        });

        await spaceTest.step('switch to the other tab and back', async () => {
          await pageObjects.unifiedTabs.navigateToTabByName(EXISTING_TAB_LABEL);
          await pageObjects.discover.waitUntilTabIsLoaded();
          await expect(pageObjects.discover.getSelectedDataView()).toContainText(
            testData.DEFAULT_DATA_VIEW
          );

          await pageObjects.unifiedTabs.navigateToTabByName(MISSING_TAB_LABEL);
          await expect(missingDataViewPrompt).toBeVisible();
        });

        await spaceTest.step('pick a replacement data view', async () => {
          await pickReplacementDataView();

          await expect(missingDataViewPrompt).toBeHidden();
          await expect(pageObjects.discover.getSelectedDataView()).toContainText(
            REPLACEMENT_DATA_VIEW
          );
          await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();
        });

        await spaceTest.step('reset the changes to ask for a replacement again', async () => {
          // Like `pageObjects.discover.revertUnsavedChanges`, but the tab renders the prompt
          // instead of the search bar it waits for
          await page.testSubj.click('discoverSaveButton-secondary-button');
          await page.testSubj.click('revertUnsavedChangesButton');

          await expect(missingDataViewPrompt).toContainText(DELETED_DATA_VIEW_ID);
          await expect(page.testSubj.locator('discoverSaveButton')).toBeHidden();
        });

        await spaceTest.step('save the session and reopen it from its saved state', async () => {
          await pickReplacementDataView();
          await pageObjects.discover.saveUnsavedChanges();
          await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

          // Drop the local tab state so the session opens with what was saved
          await page.evaluate(() => window.localStorage.setItem('discover.tabs', ''));
          await pageObjects.discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
          await pageObjects.discover.waitUntilTabIsLoaded();

          expect(await pageObjects.unifiedTabs.getSelectedTabLabel()).toBe(MISSING_TAB_LABEL);
          await expect(missingDataViewPrompt).toBeHidden();
          await expect(pageObjects.discover.getSelectedDataView()).toContainText(
            REPLACEMENT_DATA_VIEW
          );
          await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
        });
      }
    );
  }
);
