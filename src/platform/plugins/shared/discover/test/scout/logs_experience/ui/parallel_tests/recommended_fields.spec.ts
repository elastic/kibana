/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, LOGS, setupLogsExperience, teardownLogsExperience } from '../fixtures';

spaceTest.describe(
  'Logs profile - Recommended fields',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.observability.all],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should show the recommended fields group for the logs data source profile',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.selectDataView(LOGS.ALL_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        await expect(
          page.testSubj.locator(unifiedFieldList.getSidebarSectionSelector('recommended'))
        ).toBeVisible();

        // The group renders collapsed: `accordionState` is seeded once from the groups present
        // at first render, and this one only appears after the data source profile resolves,
        // so its `isInitiallyOpen: true` is never applied.
        await unifiedFieldList.openSidebarSection('recommended');

        const fieldNames = await unifiedFieldList.getSidebarSectionFieldNames('recommended');
        expect(fieldNames).toContain('event.dataset');
        expect(fieldNames).toContain('host.name');
        expect(fieldNames).toContain('message');
        expect(fieldNames).toContain('log.level');

        // Recommended by the profile, but absent from the seeded data — the group only lists
        // fields that exist, so it must not render.
        expect(fieldNames).not.toContain('service.name');
      }
    );

    spaceTest(
      'should NOT show the recommended fields group for a non-logs data source profile',
      async ({ page, discoverScoutSpace, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discoverScoutSpace.createDiscoverSession({
          title: 'metrics-system-no-recommended',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: LOGS.METRICS_DATA_VIEW,
                time_field: '@timestamp',
                name: LOGS.METRICS_DATA_VIEW,
              },
            },
          ],
        });
        await discover.loadSavedSearch('metrics-system-no-recommended');
        await discover.waitUntilTabIsLoaded();

        // The recommended-fields group must be absent for a non-logs profile
        const sectionSelector = unifiedFieldList.getSidebarSectionSelector('recommended');
        await expect(page.testSubj.locator(sectionSelector)).toBeHidden();
      }
    );
  }
);
