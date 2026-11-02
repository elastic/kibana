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
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  CONTEXT_AWARENESS_DATA_VIEWS,
} from '../fixtures';

/**
 * The Recommended fields sidebar section only renders for a data source whose profile supplies
 * `getRecommendedFields`. `my-example-logs` resolves to `example-data-source-profile`, which does;
 * `my-example-*` falls back to the default data source profile, which does not.
 *
 * Only the section's presence is asserted. Which fields survive the "recommended by the profile but
 * absent from the data" filtering is covered by
 * kbn-unified-field-list/src/hooks/use_grouped_fields.test.tsx, and the accessor's own field list by
 * profile_providers/observability/logs_data_source_profile/accessors/get_recommended_fields.test.ts.
 */
spaceTest.describe(
  'Discover context awareness - extension getRecommendedFields',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'ES|QL mode shows the recommended fields section for a matching profile',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS}`);
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await expect(
          page.testSubj.locator(unifiedFieldList.getSidebarSectionSelector('recommended'))
        ).toBeVisible();
      }
    );

    spaceTest(
      'ES|QL mode does not show the recommended fields section for a non-matching profile',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.ALL}`);
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await expect(
          page.testSubj.locator(unifiedFieldList.getSidebarSectionSelector('recommended'))
        ).toBeHidden();
      }
    );

    spaceTest(
      'data view mode shows the recommended fields section for a matching profile',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await expect(
          page.testSubj.locator(unifiedFieldList.getSidebarSectionSelector('recommended'))
        ).toBeVisible();
      }
    );

    spaceTest(
      'data view mode does not show the recommended fields section for a non-matching profile',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.ALL, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await expect(
          page.testSubj.locator(unifiedFieldList.getSidebarSectionSelector('recommended'))
        ).toBeHidden();
      }
    );
  }
);
