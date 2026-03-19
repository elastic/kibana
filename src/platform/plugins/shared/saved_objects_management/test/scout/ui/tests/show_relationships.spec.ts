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
import { test, testData } from '../fixtures';

test.describe(
  'Saved Objects Management - relationships flyout',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ kbnClient, browserAuth, pageObjects }) => {
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.SHOW_RELATIONSHIPS);
      await browserAuth.loginAsAdmin();
      await pageObjects.savedObjectsManagement.goto();
    });

    test.afterEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('displays invalid references in the relationships flyout', async ({ pageObjects }) => {
      const titles = await pageObjects.savedObjectsManagement.getRowTitles();
      expect(titles).toContain(testData.SAVED_OBJECT.DASHBOARD_WITH_MISSING_REFS_TITLE);

      await pageObjects.savedObjectsManagement.openRelationshipsFlyout(
        testData.SAVED_OBJECT.DASHBOARD_WITH_MISSING_REFS_TITLE
      );

      const invalidRelations = await pageObjects.savedObjectsManagement.getInvalidRelations();
      expect(invalidRelations).toStrictEqual([
        {
          error: 'Saved object [dashboard/missing-dashboard-ref] not found',
          id: 'missing-dashboard-ref',
          relationship: 'Child',
          type: 'dashboard',
        },
        {
          error: 'Saved object [visualization/missing-vis-ref] not found',
          id: 'missing-vis-ref',
          relationship: 'Child',
          type: 'visualization',
        },
      ]);
    });
  }
);
