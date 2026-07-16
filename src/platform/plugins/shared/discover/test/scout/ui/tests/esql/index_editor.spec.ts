/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL `LOOKUP JOIN` lookup-index editor: creating a lookup index by file
 * upload or by manually entering data, editing an existing index, saving
 * without closing, and the closed-index warning. Runs sequentially (not
 * space-scoped) because it creates/deletes real cluster-level ES indices.
 */

import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { test, EuiDataGridWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { IndexEditor } from '../../fixtures/esql/index_editor';
import {
  getEsqlBadgeHoverText,
  selectEsqlBadgeHoverOption,
  selectEsqlSuggestionByLabel,
} from '../../fixtures/esql/editor_helpers';

const INDEX_NAME_MANUAL = 'test-lookup-index-manual';
const INDEX_NAME_FILE = 'test-lookup-index-file';
const INDEX_NAME_EDITION = 'test-lookup-index-edition';
const INDEX_NAME_CLOSED = 'test-lookup-index-closed';
const ALL_INDEX_NAMES = [INDEX_NAME_MANUAL, INDEX_NAME_FILE, INDEX_NAME_EDITION, INDEX_NAME_CLOSED];

const IMPORT_FILE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'esql',
  'imports',
  'customers.csv'
);

const DEFAULT_SETTINGS = {
  defaultIndex: 'logstash-*',
  enableESQL: true,
};

const cleanLookupJoinIndexes = async (esClient: Client) => {
  for (const name of ALL_INDEX_NAMES) {
    const exists = await esClient.indices.exists({ index: name });
    if (exists) {
      try {
        await esClient.indices.open({ index: name });
      } catch {
        // ignore if already open
      }
      await esClient.indices.delete({ index: name });
    }
  }
};

/**
 * `esClient.search` returns hits in a non-deterministic order (and new rows
 * added via the editor get auto-generated ids), so docs are compared in a
 * canonical order: both the fetched and the expected docs are sorted by
 * their key-sorted JSON representation before asserting.
 */
const sortDocs = <T>(docs: T[]): T[] => {
  const canonicalize = (doc: T): string =>
    JSON.stringify(doc, Object.keys(doc as Record<string, unknown>).sort());
  return [...docs].sort((a, b) => canonicalize(a).localeCompare(canonicalize(b)));
};

const getIndexDocs = async (esClient: Client, indexName: string) => {
  try {
    const response = await esClient.search({ index: indexName, size: 100 });
    return sortDocs(response.hits.hits.map((hit) => hit._source));
  } catch {
    // Index may not exist yet (still being created) - let the caller's
    // `expect.poll` retry instead of failing on the first attempt.
    return undefined;
  }
};

const getIndexFieldTypes = async (
  esClient: Client,
  indexName: string
): Promise<Record<string, string | undefined>> => {
  const mappings = await esClient.indices.getMapping({ index: indexName });
  const properties = mappings[indexName]?.mappings.properties ?? {};
  return Object.fromEntries(
    Object.entries(properties).map(([field, mapping]) => [
      field,
      'type' in mapping ? mapping.type : undefined,
    ])
  );
};

test.describe('Discover ES|QL index editor', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(
      'src/platform/test/functional/fixtures/kbn_archiver/discover'
    );
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await kbnClient.uiSettings.replace(DEFAULT_SETTINGS);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, esClient }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await cleanLookupJoinIndexes(esClient);
  });

  test.afterEach(async ({ esClient }) => {
    await cleanLookupJoinIndexes(esClient);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.uiSettings.unset('enableESQL');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows creation of a lookup index by file upload', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    const indexEditor = new IndexEditor(page);
    const { discover } = pageObjects;

    await selectEsqlSuggestionByLabel(
      discover.codeEditor,
      `from logstash-* | LOOKUP JOIN ${INDEX_NAME_FILE}`,
      `Create lookup index "${INDEX_NAME_FILE}"`
    );
    await expect(page.testSubj.locator('lookupIndexFlyout')).toBeVisible();

    await indexEditor.uploadFile(IMPORT_FILE_PATH);
    await expect(page.testSubj.locator('fileUploadLiteLookupSteps')).toBeVisible();
    await page.testSubj.click('fileUploadLiteLookupReviewButton');
    await page.testSubj.click('fileUploadLiteLookupImportButton');

    const finishButton = page.testSubj.locator('fileUploadLiteLookupFinishButton');
    await expect(finishButton).toBeEnabled({ timeout: 20_000 });
    await finishButton.click();
    await expect(page.testSubj.locator('fileUploadLiteLookupSteps')).toBeHidden();

    const grid = new EuiDataGridWrapper(page, { locator: '.euiDataGrid' });
    await expect
      .poll(() => grid.getColumnsNames())
      .toStrictEqual(
        expect.arrayContaining([
          'Keywordcustomer_first_name',
          'Keywordcustomer_full_name',
          'Keywordcustomer_gender',
          'Numbercustomer_id',
          'Keywordcustomer_last_name',
          'Keywordemail',
        ])
      );
    await expect(grid.getCellLocatorByColId(0, 'customer_first_name')).toContainText('Elyssa');
    await expect(grid.getCellLocatorByColId(0, 'customer_full_name')).toContainText(
      'Elyssa Underwood'
    );

    await indexEditor.closeIndexEditor();
    await expect(page.testSubj.locator('lookupIndexFlyout')).toBeHidden();

    const updatedQuery = await discover.codeEditor.getCodeEditorValue();
    expect(updatedQuery).toContain(`LOOKUP JOIN ${INDEX_NAME_FILE}`);

    await expect
      .poll(() => getIndexDocs(esClient, INDEX_NAME_FILE))
      .toStrictEqual([
        {
          customer_first_name: 'Elyssa',
          customer_full_name: 'Elyssa Underwood',
          customer_gender: 'FEMALE',
          customer_id: '27',
          customer_last_name: 'Underwood',
          email: 'elyssa@underwood-family.zzz',
        },
      ]);
  });

  test('allows creation of a lookup index by manually adding data', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    const indexEditor = new IndexEditor(page);
    const { discover } = pageObjects;

    await selectEsqlSuggestionByLabel(
      discover.codeEditor,
      'from logstash-* | LOOKUP JOIN ',
      'Create lookup index'
    );

    await page.testSubj.fill('indexNameInput', INDEX_NAME_MANUAL);
    await page.testSubj.click('indexNameSaveButton');
    await expect(page.testSubj.locator('indexNameReadMode')).toBeVisible();

    await expect.poll(() => indexEditor.getColumnNames()).not.toHaveLength(0);
    const initialColumns = await indexEditor.getColumnNames();
    const placeholderCount = initialColumns.length;
    expect(placeholderCount).toBeGreaterThan(0);

    for (let index = 0; index < placeholderCount; index++) {
      await indexEditor.setColumn(`column-${index + 1}`, 'Keyword', index);
    }
    await expect
      .poll(() => indexEditor.getColumnNames())
      .toStrictEqual(Array.from({ length: placeholderCount }, (_, i) => `column-${i + 1}`));

    await indexEditor.addColumn('extra-column', 'Keyword');
    await expect.poll(() => indexEditor.getColumnNames()).toHaveLength(placeholderCount + 1);

    await indexEditor.addColumn('column-to-be-deleted', 'Text');
    await indexEditor.deleteColumn('column-to-be-deleted');
    await expect.poll(() => indexEditor.getColumnNames()).toHaveLength(placeholderCount + 1);

    // Cell values are addressed by their raw grid position: 3 leading
    // control columns (unsaved-row indicator, selection, add-row) precede
    // the data columns (4 placeholders + 1 "extra-column").
    for (let colIndex = 3; colIndex <= placeholderCount + 3; colIndex++) {
      await indexEditor.setCellValue(0, colIndex, `value-1-${colIndex - 2}`);
    }

    await indexEditor.addRow(0);
    for (let colIndex = 3; colIndex <= placeholderCount + 3; colIndex++) {
      await indexEditor.setCellValue(1, colIndex, `value-2-${colIndex - 2}`);
    }

    await indexEditor.setColumn('renamed-column-1', 'Text', 0);

    await indexEditor.saveChangesAndClose();

    const updatedQuery = await discover.codeEditor.getCodeEditorValue();
    expect(updatedQuery).toContain(`| LOOKUP JOIN ${INDEX_NAME_MANUAL}`);

    await expect
      .poll(() => getIndexDocs(esClient, INDEX_NAME_MANUAL))
      .toStrictEqual(
        sortDocs([
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
        ])
      );

    // The selected column types must translate into the corresponding ES
    // field mappings ("Text" -> text, "Keyword" -> keyword).
    expect(await getIndexFieldTypes(esClient, INDEX_NAME_MANUAL)).toMatchObject({
      'renamed-column-1': 'text',
      'column-2': 'keyword',
      'column-3': 'keyword',
      'column-4': 'keyword',
      'extra-column': 'keyword',
    });
  });

  test('allows editing an existing lookup index', async ({ page, pageObjects, esClient }) => {
    const indexEditor = new IndexEditor(page);
    const { discover } = pageObjects;

    await esClient.indices.create({ index: INDEX_NAME_EDITION, settings: { mode: 'lookup' } });
    await esClient.bulk({
      index: INDEX_NAME_EDITION,
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

    await expect(async () => {
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await discover.codeEditor.setCodeEditorValue(
        `from logstash-* | LOOKUP JOIN ${INDEX_NAME_EDITION}`
      );
      await expect(page.locator('.lookupIndexEditBadge')).toBeAttached({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await selectEsqlBadgeHoverOption(page, 'lookupIndexBadge', 'Edit lookup index');
    await expect(page.testSubj.locator('lookupIndexFlyout')).toBeVisible();

    const grid = new EuiDataGridWrapper(page, { locator: '.euiDataGrid' });
    await expect.poll(() => grid.getRowsCount()).toBe(2);

    await indexEditor.search('customer_first_name: Elyssa');
    await expect.poll(() => grid.getRowsCount()).toBe(1);
    await indexEditor.search('');
    await expect.poll(() => grid.getRowsCount()).toBe(2);

    const firstNameColumn = 3;
    const fullNameColumn = 4;
    const ageColumn = 9; // 6 existing data columns precede the newly added "age" column

    await indexEditor.setCellValue(0, firstNameColumn, 'Jasmin');
    await indexEditor.setCellValue(0, fullNameColumn, 'Jasmin Upperwood');
    await indexEditor.setCellValue(1, firstNameColumn, 'Philip');
    await indexEditor.setCellValue(1, fullNameColumn, 'Philip Tompsoon');

    await indexEditor.addRow(0);
    await indexEditor.setCellValue(1, firstNameColumn, 'New Name');
    await indexEditor.setCellValue(1, fullNameColumn, 'New Name Surname');
    await expect.poll(() => grid.getRowsCount()).toBe(3);

    await indexEditor.deleteRow(1);
    await expect.poll(() => grid.getRowsCount()).toBe(2);

    await indexEditor.addRow(0);
    await indexEditor.setCellValue(1, firstNameColumn, 'Pedro');
    await indexEditor.setCellValue(1, fullNameColumn, 'Pedro Fernandez');
    await expect.poll(() => grid.getRowsCount()).toBe(3);

    await indexEditor.addColumn('age', 'Integer');
    await indexEditor.setCellValue(0, ageColumn, '30');
    await indexEditor.setCellValue(1, ageColumn, '40');
    await indexEditor.setCellValue(2, ageColumn, '25');

    await indexEditor.closeIndexEditor();
    await expect(page.testSubj.locator('indexEditorUnsavedChangesModal')).toBeVisible();
    await page.testSubj.click('confirmModalCancelButton');
    await expect(page.testSubj.locator('indexEditorUnsavedChangesModal')).toBeHidden();

    await indexEditor.saveChangesAndClose();

    await expect
      .poll(() => getIndexDocs(esClient, INDEX_NAME_EDITION))
      .toStrictEqual(
        sortDocs([
          {
            customer_first_name: 'Jasmin',
            customer_full_name: 'Jasmin Upperwood',
            customer_gender: 'FEMALE',
            customer_id: '27',
            customer_last_name: 'Underwood',
            email: 'elyssa@underwood-family.zzz',
            age: 30,
          },
          {
            customer_first_name: 'Philip',
            customer_full_name: 'Philip Tompsoon',
            customer_gender: 'MALE',
            customer_id: '50',
            customer_last_name: 'Thompson',
            email: 'phil@thompson-family.zzz',
            age: 25,
          },
          {
            customer_first_name: 'Pedro',
            customer_full_name: 'Pedro Fernandez',
            age: 40,
          },
        ])
      );

    // The newly added "age" column ("Integer") must be mapped as integer,
    // while the pre-existing dynamically-mapped columns stay text.
    expect(await getIndexFieldTypes(esClient, INDEX_NAME_EDITION)).toMatchObject({
      age: 'integer',
      customer_first_name: 'text',
      customer_full_name: 'text',
      customer_gender: 'text',
      customer_id: 'text',
      customer_last_name: 'text',
      email: 'text',
    });
  });

  test('allows saving an edit without closing the flyout', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    const indexEditor = new IndexEditor(page);
    const { discover } = pageObjects;

    await selectEsqlSuggestionByLabel(
      discover.codeEditor,
      `from logstash-* | LOOKUP JOIN ${INDEX_NAME_MANUAL}`,
      `Create lookup index "${INDEX_NAME_MANUAL}"`
    );
    await expect(page.testSubj.locator('lookupIndexFlyout')).toBeVisible();

    await expect.poll(() => indexEditor.getColumnNames()).not.toHaveLength(0);
    await indexEditor.setColumn('my_column', 'Text', 0);
    await indexEditor.setCellValue(0, 3, 'value');
    await indexEditor.saveChanges();

    await expect
      .poll(() => getIndexDocs(esClient, INDEX_NAME_MANUAL))
      .toStrictEqual([{ my_column: 'value' }]);
  });

  test('shows a closed-index warning instead of the create suggestion', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    await esClient.indices.create({ index: INDEX_NAME_CLOSED, settings: { mode: 'lookup' } });
    await esClient.indices.close({ index: INDEX_NAME_CLOSED });

    await expect(async () => {
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.codeEditor.setCodeEditorValue(
        `from logstash-* | LOOKUP JOIN ${INDEX_NAME_CLOSED} ON customer_id`
      );
      await expect(page.locator('.lookupIndexClosedBadge')).toBeAttached({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });

    const hoverText = await getEsqlBadgeHoverText(page, 'lookupIndexClosedBadge');
    expect(hoverText).toContain('closed');
    expect(hoverText).not.toContain('Create lookup index');
    expect(hoverText).not.toContain('Edit lookup index');
  });
});
