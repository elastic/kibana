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
import { spaceTest } from '../../fixtures';

spaceTest.describe(
  'Discover ES|QL view - switch to classic modal',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
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
        const { discover } = pageObjects;

        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode({ discardModal: true });
        await discover.waitUntilTabIsLoaded();

        // Only assert the data views loaded by this test's archives: extras
        // like the managed "All logs" data view are environment-specific
        // (present on some serverless projects, absent on others).
        const availableDataViews = await discover.getAvailableDataViewNames();
        for (const item of ['kibana_sample_data_flights', 'logstash-*']) {
          expect(availableDataViews).toContain(item);
        }

        // Explicitly select logstash-*: the data view Discover lands on after
        // the mode switch is environment-dependent (e.g. the observability
        // root profile defaults to its "All logs" ad hoc data view, which
        // excludes logstash indices).
        await discover.selectDataView('logstash-*');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getSelectedDataViewName()).toBe('logstash-*');
        await expect.poll(() => discover.getHitCountInt()).toBe(14004);
      }
    );
  }
);
