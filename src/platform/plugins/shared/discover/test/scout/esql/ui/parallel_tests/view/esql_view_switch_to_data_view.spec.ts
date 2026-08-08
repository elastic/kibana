/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL to classic (data view) mode switch: switching applies immediately,
 * also when a saved search has unsaved changes (the former "save and switch"
 * modal was removed in #282584).
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { spaceTest } from '../../fixtures';

const MODIFIED_QUERY = 'from logstash-* | limit 100 | drop @timestamp';

spaceTest.describe(
  'Discover ES|QL view - switching to a data view',
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

    spaceTest('switches to a data view immediately', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.selectDataViewMode();
      await discover.waitUntilTabIsLoaded();
      await expect(page.testSubj.locator('ESQLEditor')).toBeHidden();
    });

    spaceTest(
      'switches to a data view immediately while a saved search has unsaved changes',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.saveSearch('esql_test');
        await discover.waitUntilTabIsLoaded();

        await discover.codeEditor.setCodeEditorValue(MODIFIED_QUERY);
        await discover.submitQuery();
        await discover.waitUntilTabIsLoaded();

        await discover.selectDataViewMode();
        await discover.waitUntilTabIsLoaded();
        await expect(page.testSubj.locator('ESQLEditor')).toBeHidden();
      }
    );

    spaceTest(
      'shows available data views and results after switching to classic mode',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await discover.selectDataViewMode();
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
