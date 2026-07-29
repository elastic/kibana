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
const INITIAL_COLUMN_PLACEHOLDERS = 4;
const DATA_COLUMN_INDEXES = Array.from(
  { length: INITIAL_COLUMN_PLACEHOLDERS + 1 },
  (_, i) => NUMBER_OF_CONTROL_COLUMNS + i
);

const getIndexName = (scoutSpaceId: string) => `test-lookup-index-manual-${scoutSpaceId}`;

spaceTest.describe(
  'Discover ES|QL lookup-join index editor - manual creation',
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
      'creates a lookup index by manually adding fields and rows',
      async ({ pageObjects, esClient, scoutSpace }) => {
        const { discover, lookupIndexEditor } = pageObjects;
        const indexName = getIndexName(scoutSpace.id);

        const setRowValues = async (rowIndex: number, rowNumber: number) => {
          for (const colIndex of DATA_COLUMN_INDEXES) {
            await lookupIndexEditor.setCellValue(
              rowIndex,
              colIndex,
              `value-${rowNumber}-${colIndex - NUMBER_OF_CONTROL_COLUMNS + 1}`
            );
          }
        };

        await lookupIndexEditor.openFromSuggestion(
          discover.codeEditor,
          'from logstash-* | LOOKUP JOIN ',
          'Create lookup index'
        );
        await lookupIndexEditor.setIndexName(indexName);

        expect(await lookupIndexEditor.getColumnNames()).toHaveLength(INITIAL_COLUMN_PLACEHOLDERS);

        for (const index of Array.from({ length: INITIAL_COLUMN_PLACEHOLDERS }, (_, i) => i)) {
          await lookupIndexEditor.setColumn(index, `column-${index + 1}`, 'keyword');
        }
        expect(await lookupIndexEditor.getColumnNames()).toStrictEqual([
          'column-1',
          'column-2',
          'column-3',
          'column-4',
        ]);

        // Add a new column
        await lookupIndexEditor.addColumn('extra-column', 'keyword');
        expect(await lookupIndexEditor.getColumnNames()).toHaveLength(
          INITIAL_COLUMN_PLACEHOLDERS + 1
        );

        // Add another column and then delete it
        await lookupIndexEditor.addColumn('column-to-be-deleted', 'text');
        await lookupIndexEditor.deleteColumn('column-to-be-deleted');
        expect(await lookupIndexEditor.getColumnNames()).toHaveLength(
          INITIAL_COLUMN_PLACEHOLDERS + 1
        );

        // Add cell values for the first row
        await setRowValues(0, 1);

        // Add new row with values
        await lookupIndexEditor.addRow(0);
        await setRowValues(1, 2);

        // Rename the first column
        await lookupIndexEditor.setColumn(0, 'renamed-column-1', 'text');

        await lookupIndexEditor.saveChangesAndClose();

        // Query should be updated appending the new index name
        await expect(discover.codeEditor.getCodeEditorContent()).toContainText(
          `| LOOKUP JOIN ${indexName}`
        );

        // Verify the index is created correctly and contains all the data
        await expect(async () => {
          const { hits } = await esClient.search({ index: indexName });
          const docs = hits.hits.map((hit) => hit._source);
          expect(docs).toStrictEqual([
            {
              'renamed-column-1': 'value-1-1',
              'column-2': 'value-1-2',
              'column-3': 'value-1-3',
              'column-4': 'value-1-4',
              'extra-column': 'value-1-5',
            },
            {
              'renamed-column-1': 'value-2-1',
              'column-2': 'value-2-2',
              'column-3': 'value-2-3',
              'column-4': 'value-2-4',
              'extra-column': 'value-2-5',
            },
          ]);
        }).toPass();

        const mappings = await esClient.indices.getMapping({ index: indexName });
        const properties = mappings[indexName].mappings.properties!;
        expect(properties['renamed-column-1'].type).toBe('text');
        expect(properties['column-2'].type).toBe('keyword');
        expect(properties['column-3'].type).toBe('keyword');
        expect(properties['column-4'].type).toBe('keyword');
        expect(properties['extra-column'].type).toBe('keyword');
      }
    );
  }
);
