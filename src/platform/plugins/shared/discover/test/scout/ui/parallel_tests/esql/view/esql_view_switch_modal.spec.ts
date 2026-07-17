/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL to classic (data view) mode switch: the "discard changes" modal only
 * appears when there would actually be something to lose.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';

spaceTest.describe(
  'Discover ES|QL view - switch to classic modal',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.savedObjects.load(testData.FLIGHTS_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'shows the modal when switching to a data view from an unsaved query',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.selectDataViewMode();
        await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeVisible();
      }
    );

    spaceTest(
      'does not show the modal when switching while a saved search is open unmodified',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.codeEditor.setCodeEditorValue(
          'from logstash-* | limit 100 | drop @timestamp'
        );
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.selectDataViewMode();
        await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeVisible();
        // Cancel the switch (close icon), staying in ES|QL mode, so the
        // saved search below is actually an ES|QL saved search. `EuiModal`'s
        // close button has no `data-test-subj`, so scope a role lookup to
        // the modal instead of relying on EUI's internal class name.
        await page.testSubj
          .locator('discover-esql-to-dataview-modal')
          .getByRole('button', { name: 'Closes this modal window' })
          .click();
        await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeHidden();

        await discover.saveSearch('esql_test');
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeHidden();
      }
    );

    spaceTest(
      'shows the modal when switching from a saved search with unsaved changes',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.saveSearch('esql_test2');
        await discover.waitUntilTabIsLoaded();

        await discover.codeEditor.setCodeEditorValue(
          'from logstash-* | limit 100 | drop @timestamp'
        );
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.selectDataViewMode();
        await expect(page.testSubj.locator('discover-esql-to-dataview-modal')).toBeVisible();
      }
    );

    spaceTest(
      'shows available data views and results after switching to classic mode',
      async ({ page, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode({ discardModal: true });
        await discover.waitUntilTabIsLoaded();

        // The hit count can take a moment to refresh after the mode switch
        // (the FTR original retried this same assertion for 2s via
        // `discover.assertHitCount`), so poll instead of a single read.
        await expect.poll(() => discover.getHitCountInt()).toBe(14004);

        // Only assert the data views loaded by this test's archives: extras
        // like the managed "All logs" data view are environment-specific
        // (present on some serverless projects, absent on others).
        const availableDataViews = await discover.getAvailableDataViewNames();
        for (const item of ['kibana_sample_data_flights', 'logstash-*']) {
          expect(availableDataViews).toContain(item);
        }

        await discover.selectDataView('kibana_sample_data_flights');
        await dataGrid.waitForLoad();
        expect(await discover.getSelectedDataViewName()).toBe('kibana_sample_data_flights');
      }
    );
  }
);
