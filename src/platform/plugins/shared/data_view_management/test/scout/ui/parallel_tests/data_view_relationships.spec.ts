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

// Contains the logstash-* data view and one saved search that references it.
const KBN_ARCHIVE_DISCOVER = 'src/platform/test/functional/fixtures/kbn_archiver/discover';

spaceTest.describe('Data view relationships', { tag: tags.deploymentAgnostic }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(KBN_ARCHIVE_DISCOVER);
    const dataView = imported.find(({ type }) => type === 'index-pattern');
    if (!dataView) {
      throw new Error(`No data view found in ${KBN_ARCHIVE_DISCOVER}`);
    }
    dataViewId = dataView.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows the saved objects that reference the data view', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.openRelationshipsTab();

    await expect.poll(() => dataViewDetail.getRelationshipsTabCount()).toBe(1);
  });
});
