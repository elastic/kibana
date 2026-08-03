/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';
import { LOOKUP_INDEX_EDITOR_ROLE } from '../../../common/feature_controls/roles';

// Leading control columns rendered before the data columns: the unsaved-row color indicator,
// the selection column, and the add-row column.
const NUMBER_OF_CONTROL_COLUMNS = 3;
const FIRST_NAME_COLUMN = NUMBER_OF_CONTROL_COLUMNS;
// 6 existing data columns precede the newly added "age" column
const AGE_COLUMN = NUMBER_OF_CONTROL_COLUMNS + 6;

const getIndexName = (scoutSpaceId: string) => `test-lookup-index-edition-${scoutSpaceId}`;

spaceTest.describe(
  'Discover ES|QL lookup-join index editor - editing an existing index',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace, esClient }) => {
      const indexName = getIndexName(scoutSpace.id);

      await esClient.indices.create({ index: indexName, settings: { mode: 'lookup' } });
      await esClient.bulk({
        index: indexName,
        refresh: 'wait_for',
        operations: [
          { index: { _id: '1' } },
          {
            customer_first_name: 'Elyssa',
            customer_full_name: 'Elyssa Underwood',
            customer_gender: 'FEMALE',
            customer_id: '27',
            customer_last_name: 'Underwood',
            email: 'elyssa@underwood-family.zzz',
          },
          { index: { _id: '2' } },
          {
            customer_first_name: 'Phil',
            customer_full_name: 'Phil Thompson',
            customer_gender: 'MALE',
            customer_id: '50',
            customer_last_name: 'Thompson',
            email: 'phil@thompson-family.zzz',
          },
        ],
      });

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

    spaceTest('edits an existing lookup index', async ({ pageObjects, esClient, scoutSpace }) => {
      const { discover, lookupIndexEditor } = pageObjects;
      const indexName = getIndexName(scoutSpace.id);

      await discover.codeEditor.setCodeEditorValue(`from logstash-* | LOOKUP JOIN ${indexName}`);
      await discover.codeEditor.selectDecorationHoverOption(
        'lookupIndexBadge',
        'Edit lookup index'
      );
      await lookupIndexEditor.waitForOpen();

      await expect(lookupIndexEditor.rows).toHaveCount(2);

      // Filter rows
      await lookupIndexEditor.search('customer_first_name: Elyssa');
      await expect(lookupIndexEditor.rows).toHaveCount(1);

      await lookupIndexEditor.search('');
      await expect(lookupIndexEditor.rows).toHaveCount(2);

      // Edit an existing value and add a typed column
      await lookupIndexEditor.setCellValue(0, FIRST_NAME_COLUMN, 'Jasmin');
      await lookupIndexEditor.addColumn('age', 'integer');
      await lookupIndexEditor.setCellValue(0, AGE_COLUMN, '30');

      // Try to exit without saving changes
      await lookupIndexEditor.close();
      await expect(lookupIndexEditor.unsavedChangesModal).toBeVisible();

      // Go back to save
      await lookupIndexEditor.cancelCloseWithoutSaving();
      await lookupIndexEditor.saveChangesAndClose();

      // Verify the editions took place correctly
      await expect(async () => {
        const { hits } = await esClient.search({ index: indexName });
        const docs = hits.hits.map((hit) => hit._source);
        expect(docs).toStrictEqual([
          {
            customer_first_name: 'Jasmin',
            customer_full_name: 'Elyssa Underwood',
            customer_gender: 'FEMALE',
            customer_id: '27',
            customer_last_name: 'Underwood',
            email: 'elyssa@underwood-family.zzz',
            age: 30,
          },
          {
            customer_first_name: 'Phil',
            customer_full_name: 'Phil Thompson',
            customer_gender: 'MALE',
            customer_id: '50',
            customer_last_name: 'Thompson',
            email: 'phil@thompson-family.zzz',
          },
        ]);
      }).toPass();

      const mappings = await esClient.indices.getMapping({ index: indexName });
      const properties = mappings[indexName].mappings.properties!;
      expect(properties.age.type).toBe('integer');
      expect(properties.customer_first_name.type).toBe('text');
      expect(properties.customer_full_name.type).toBe('text');
      expect(properties.customer_gender.type).toBe('text');
      expect(properties.customer_id.type).toBe('text');
      expect(properties.customer_last_name.type).toBe('text');
      expect(properties.email.type).toBe('text');
    });
  }
);
