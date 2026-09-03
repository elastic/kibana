/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../../common/ui/fixtures';

const LEGACY_LOG_STREAM_DASHBOARD_ARCHIVE =
  'src/platform/plugins/shared/discover/test/scout/core/ui/fixtures/kbn_archives/log_stream_dashboard_saved_object.ndjson';

spaceTest.describe(
  'Dashboard with legacy log stream embeddable',
  { tag: '@local-stateful-classic' },
  () => {
    let dashboardId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const [dashboard] = await scoutSpace.savedObjects.load(LEGACY_LOG_STREAM_DASHBOARD_ARCHIVE);
      dashboardId = dashboard.id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'loads the old log stream as a saved search embeddable',
      async ({ page, pageObjects }) => {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);

        await expect(page.testSubj.locator('unifiedDataTableToolbar')).toBeVisible();
        await expect(page.testSubj.locator('dataGridHeader')).toBeVisible();
      }
    );
  }
);
