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
import { spaceTest } from '../fixtures';
import { GROUP_ALPHA, GROUP_BETA } from '../fixtures/constants';
import { cleanupAnnotationListing, seedAnnotationListing } from '../fixtures/seed_fixtures';

spaceTest.describe(
  'Event Annotation listing page - delete flow',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => {
      await seedAnnotationListing({
        kbnClient,
        scoutSpace,
        groups: [GROUP_ALPHA, GROUP_BETA],
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
      await cleanupAnnotationListing({ kbnClient, scoutSpace });
    });

    spaceTest(
      'select all and delete removes every group and surfaces the empty state',
      async ({ pageObjects }) => {
        await pageObjects.annotationListing.goto();
        await expect(pageObjects.annotationListing.contentList.itemLinks).toHaveCount(2);

        await pageObjects.annotationListing.contentList.selectAllAndDelete();

        await expect(pageObjects.annotationListing.contentList.itemLinks).toHaveCount(0);
        await expect(pageObjects.annotationListing.emptyPromptCreateButton).toBeVisible();
      }
    );
  }
);
