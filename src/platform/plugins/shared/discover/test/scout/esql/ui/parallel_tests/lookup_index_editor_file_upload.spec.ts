/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';
import { LOOKUP_INDEX_EDITOR_ROLE } from '../../../../common/feature_controls/roles';

const IMPORT_FILE_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'common',
  'customers.csv'
);

const getIndexName = (scoutSpaceId: string) => `test-lookup-index-file-${scoutSpaceId}`;

spaceTest.describe(
  'Discover ES|QL lookup-join index editor - file upload',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(LOOKUP_INDEX_EDITOR_ROLE);
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.codeEditor.waitCodeEditorReady('ESQLEditor');
    });

    spaceTest.afterEach(async ({ esClient, scoutSpace }) => {
      await esClient.indices.delete({
        index: getIndexName(scoutSpace.id),
        ignore_unavailable: true,
      });
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'creates a lookup index by uploading a file',
      async ({ page, pageObjects, esClient, scoutSpace }) => {
        const { discover, lookupIndexEditor } = pageObjects;
        const indexName = getIndexName(scoutSpace.id);

        await lookupIndexEditor.openFromSuggestion(
          discover.codeEditor,
          `from logstash-* | LOOKUP JOIN ${indexName}`,
          `Create lookup index "${indexName}"`
        );

        await lookupIndexEditor.uploadFile(IMPORT_FILE_PATH);

        const uploadSteps = page.testSubj.locator('fileUploadLiteLookupSteps');
        await expect(uploadSteps).toBeVisible();
        await page.testSubj.click('fileUploadLiteLookupReviewButton');
        await page.testSubj.click('fileUploadLiteLookupImportButton');

        const finishButton = page.testSubj.locator('fileUploadLiteLookupFinishButton');
        await expect(finishButton).toBeEnabled({ timeout: 20_000 });
        await finishButton.click();
        await uploadSteps.waitFor({ state: 'hidden' });

        // Preview grid is populated from the imported file
        await expect(lookupIndexEditor.rows).toHaveCount(1);

        await lookupIndexEditor.close();
        await lookupIndexEditor.waitForClosed();

        await expect(async () => {
          const { hits } = await esClient.search({ index: indexName });
          const docs = hits.hits.map((hit) => hit._source);
          expect(docs).toStrictEqual([
            {
              customer_first_name: 'Elyssa',
              customer_full_name: 'Elyssa Underwood',
              customer_gender: 'FEMALE',
              customer_id: '27',
              customer_last_name: 'Underwood',
              email: 'elyssa@underwood-family.zzz',
            },
          ]);
        }).toPass();
      }
    );
  }
);
