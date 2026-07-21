/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL saved-search column persistence: initial and custom columns for both
 * non-transformational and transformational commands are saved, restored on
 * reload, and restored again when switching between saved searches.
 */

import { spaceTest } from '../../fixtures';

interface ColumnTestCase {
  id: string;
  query: string;
  /** `column_order` stored on the saved session tab. */
  savedColumnOrder: string[];
  /** Columns the data grid/table is expected to show when the tab is restored. */
  expectedGridColumns: string[];
}

const columnTestCases: ColumnTestCase[] = [
  {
    id: 'non_transformational_initial_columns',
    query: 'FROM logstash-* | LIMIT 1',
    savedColumnOrder: [],
    expectedGridColumns: ['@timestamp', 'Summary'],
  },
  {
    id: 'non_transformational_custom_columns',
    query: 'FROM logstash-* | LIMIT 100',
    savedColumnOrder: ['bytes', 'extension'],
    expectedGridColumns: ['@timestamp', 'bytes', 'extension'],
  },
  {
    id: 'transformational_initial_columns',
    query: 'FROM logstash-* | LIMIT 100 | KEEP ip, @timestamp, bytes',
    savedColumnOrder: ['ip', '@timestamp', 'bytes'],
    expectedGridColumns: ['ip', '@timestamp', 'bytes'],
  },
  {
    id: 'transformational_custom_columns',
    query: 'FROM logstash-* | LIMIT 100 | KEEP ip, @timestamp, bytes',
    savedColumnOrder: ['ip', 'bytes'],
    expectedGridColumns: ['ip', 'bytes'],
  },
];

spaceTest.describe(
  'Discover ES|QL columns - saved searches / discover sessions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      const tabs = columnTestCases.map(({ id, query, savedColumnOrder }) => ({
        id,
        label: id,
        column_order: savedColumnOrder,
        data_source: {
          type: 'esql' as const,
          query,
        },
      }));
      await discoverScoutSpace.createDiscoverSession({
        title: 'columns',
        tabs,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'column behavior of (non-)transitional queries with new Discover session',
      async ({ page, pageObjects }) => {
        const { discover, unifiedFieldList } = pageObjects;

        const expectDocHeaderAfterReload = async (columns: string[]) => {
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          await discover.expectDocHeaderToEqual(columns);
        };

        await spaceTest.step('initial columns for a non-transformational command', async () => {
          const columns = ['@timestamp', 'Summary'];
          await discover.expectDocHeaderToEqual(columns);
        });

        await spaceTest.step('custom columns for a non-transformational command', async () => {
          await discover.clickNewSearch();
          const columns = ['@timestamp', 'bytes', 'extension'];
          await unifiedFieldList.clickFieldListItemAdd('bytes');
          await unifiedFieldList.clickFieldListItemAdd('extension');
          await discover.expectDocHeaderToEqual(columns);
        });

        await spaceTest.step('initial columns for a transformational command', async () => {
          await discover.clickNewSearch();
          const columns = ['ip', '@timestamp', 'bytes'];
          await discover.codeEditor.setCodeEditorValue(
            'FROM logstash-* | LIMIT 100 | KEEP ip, @timestamp, bytes'
          );
          await discover.submitQuery();
          await discover.expectDocHeaderToEqual(columns);
          await expectDocHeaderAfterReload(columns);
        });

        await spaceTest.step('custom columns for a transformational command', async () => {
          await discover.clickNewSearch();
          const columns = ['ip', 'bytes'];
          await discover.codeEditor.setCodeEditorValue(
            'FROM logstash-* | LIMIT 100 | KEEP ip, @timestamp, bytes'
          );
          await discover.submitQuery();
          await unifiedFieldList.clickFieldListItemRemove('@timestamp');
          await discover.expectDocHeaderToEqual(columns);
          await expectDocHeaderAfterReload(columns);
        });
      }
    );

    spaceTest(
      'column behavior of (non-)transitional queries when restoring a saved Discover session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        await discover.loadSavedSearch('columns');
        await discover.expectDocHeaderToEqual(columnTestCases[0].expectedGridColumns);

        for (const [tabIndex, { expectedGridColumns }] of columnTestCases.entries()) {
          await unifiedTabs.selectTab(tabIndex);
          await discover.expectDocHeaderToEqual(expectedGridColumns);
        }
      }
    );
  }
);
