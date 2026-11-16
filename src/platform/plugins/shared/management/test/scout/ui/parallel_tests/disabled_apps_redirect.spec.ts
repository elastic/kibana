/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

// Disabled for every serverless project in config/serverless.yml.
const DISABLED_APPS = [
  { appName: 'Upgrade Assistant', path: 'stack/upgrade_assistant' },
  { appName: 'Migrate', path: 'data/migrate_data' },
  { appName: 'Remote Clusters', path: 'data/remote_clusters' },
  { appName: 'Cross-Cluster Replication', path: 'data/cross_cluster_replication' },
  { appName: 'Snapshot and Restore', path: 'data/snapshot_restore' },
  { appName: 'Index Lifecycle Management', path: 'data/index_lifecycle_management' },
  { appName: 'Rollup Jobs', path: 'data/rollup_jobs' },
  { appName: 'License Management', path: 'stack/license_management' },
  { appName: 'Watcher', path: 'insightsAndAlerting/watcher' },
  { appName: 'Users', path: 'security/users' },
  { appName: 'Role Mappings', path: 'security/role_mappings' },
];

test.describe(
  'Stack Management — disabled apps',
  {
    tag: [
      ...tags.serverless.search,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('redirects disabled apps to the management landing page', async ({
      page,
      pageObjects,
    }) => {
      for (const { appName, path } of DISABLED_APPS) {
        await test.step(`${appName} is not accessible`, async () => {
          await page.gotoApp(`management/${path}`);
          await expect.soft(pageObjects.management.cardsNavigationPage).toBeVisible();
        });
      }
    });
  }
);
