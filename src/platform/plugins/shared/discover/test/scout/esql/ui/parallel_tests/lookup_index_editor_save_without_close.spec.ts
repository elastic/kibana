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
import { LOOKUP_INDEX_EDITOR_ROLE } from '../../../../common/feature_controls/roles';

// Leading control columns rendered before the data columns: the unsaved-row color indicator,
// the selection column, and the add-row column.
const NUMBER_OF_CONTROL_COLUMNS = 3;

const getIndexName = (scoutSpaceId: string) => `test-lookup-index-save-${scoutSpaceId}`;

spaceTest.describe(
  'Discover ES|QL lookup-join index editor - save without closing',
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
      'saves lookup index content without closing the flyout',
      async ({ pageObjects, esClient, scoutSpace }) => {
        const { discover, lookupIndexEditor } = pageObjects;
        const indexName = getIndexName(scoutSpace.id);

        await lookupIndexEditor.openFromSuggestion(
          discover.codeEditor,
          `from logstash-* | LOOKUP JOIN ${indexName}`,
          `Create lookup index "${indexName}"`
        );

        await lookupIndexEditor.setColumn(0, 'my_column', 'text');
        await lookupIndexEditor.setCellValue(0, NUMBER_OF_CONTROL_COLUMNS, 'value');

        await lookupIndexEditor.saveChanges();
        await expect(lookupIndexEditor.flyout).toBeVisible();

        await expect(async () => {
          const { hits } = await esClient.search({ index: indexName });
          const docs = hits.hits.map((hit) => hit._source);
          expect(docs).toStrictEqual([{ my_column: 'value' }]);
        }).toPass();
      }
    );
  }
);
