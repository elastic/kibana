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

// Migrated from: src/platform/test/functional/apps/management/group1/_index_pattern_filter.ts
// Serverless mirror: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_index_pattern_filter.ts
// Type filter and text search tests moved to Jest (tabs.test.tsx / table.test.tsx).
// ES archives (logstash_functional) are loaded once in parallel_tests/global.setup.ts.

spaceTest.describe('Data view field list filters', { tag: tags.deploymentAgnostic }, () => {
  let logstashDataViewId: string;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.uiSettings.set({});
    const { data } = await apiServices.dataViews.create({
      title: 'logstash-*',
      spaceId: scoutSpace.id,
    });
    logstashDataViewId = data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'schema type filter shows only runtime fields when set to runtime',
    async ({ pageObjects }) => {
      const expectedUnfilteredStart = [
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        '@timestamp',
        '_id',
        '_ignored',
        '_index',
        '_score',
        '_source',
      ];

      await spaceTest.step(
        'navigate to data view detail and add a runtime field via the UI',
        async () => {
          await pageObjects.dataViewDetail.goto(logstashDataViewId);
          await pageObjects.dataViewDetail.addRuntimeField('_test', 'Keyword', "emit('hi')");
        }
      );

      await spaceTest.step(
        'verify unfiltered field list starts with expected alphabetical fields',
        async () => {
          const fieldNames = await pageObjects.dataViewDetail.getFieldNames();
          expect(fieldNames.slice(0, expectedUnfilteredStart.length)).toStrictEqual(
            expectedUnfilteredStart
          );
        }
      );

      await spaceTest.step(
        'filter by runtime schema and verify only the runtime field is shown',
        async () => {
          await pageObjects.dataViewDetail.setSchemaFieldTypeFilter('runtime');
          const fieldNames = await pageObjects.dataViewDetail.getFieldNames();
          expect(fieldNames).toStrictEqual(['_test']);
        }
      );

      await spaceTest.step(
        'filter by indexed schema and verify the original field list is restored',
        async () => {
          await pageObjects.dataViewDetail.setSchemaFieldTypeFilter('indexed');
          const fieldNames = await pageObjects.dataViewDetail.getFieldNames();
          expect(fieldNames.slice(0, expectedUnfilteredStart.length)).toStrictEqual(
            expectedUnfilteredStart
          );
        }
      );
    }
  );

  spaceTest(
    'conflict filter button resets other filters and shows only the conflicting field',
    async ({ pageObjects, esClient, scoutSpace }) => {
      // Worker-unique name to avoid collisions when running in parallel.
      const conflictIndex = `logstash-wrong-${scoutSpace.id}`;

      await spaceTest.step(
        'create an index with a conflicting mapping for the bytes field',
        async () => {
          await esClient.indices.delete({ index: conflictIndex }).catch(() => {});
          await esClient.indices.create({
            index: conflictIndex,
            mappings: { properties: { bytes: { type: 'keyword' } } },
          });
          await esClient.index({
            index: conflictIndex,
            document: { bytes: 'wrong_value' },
            refresh: 'wait_for',
          });
        }
      );

      await spaceTest.step(
        'navigate to data view detail and refresh to detect the conflict',
        async () => {
          await pageObjects.dataViewDetail.goto(logstashDataViewId);
          await pageObjects.dataViewDetail.refreshFieldList();
          await expect(pageObjects.dataViewDetail.mappingConflictBadge).toBeVisible();
        }
      );

      await spaceTest.step(
        'set multiple filters so they are all active before pressing View conflicts',
        async () => {
          await pageObjects.dataViewDetail.filterByText('unknown');
          await pageObjects.dataViewDetail.setFieldTypeFilter('text');
          await pageObjects.dataViewDetail.setSchemaFieldTypeFilter('runtime');
          const types = await pageObjects.dataViewDetail.getFieldTypes();
          expect(types).toStrictEqual([]);
        }
      );

      await spaceTest.step(
        'click View conflicts and verify all other filters were reset',
        async () => {
          await pageObjects.dataViewDetail.viewConflictsButton.click();
          const fieldNames = await pageObjects.dataViewDetail.getFieldNames();
          expect(fieldNames).toStrictEqual(['bytes']);
          const fieldTypes = await pageObjects.dataViewDetail.getFieldTypes();
          expect(fieldTypes).toStrictEqual(['keyword, long\nConflict']);
        }
      );

      await spaceTest.step('clean up the conflict index', async () => {
        await esClient.indices.delete({ index: conflictIndex }).catch(() => {});
      });
    }
  );
});
