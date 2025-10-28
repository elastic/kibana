/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import path from 'path';
import type { FtrProviderContext } from '../ftr_provider_context';

const INDEX_NAME_MANUAL = 'test-lookup-index-manual';
const INDEX_NAME_FILE = 'test-lookup-index-file';
const INDEX_NAME_EDITION = 'test-lookup-index-edition';
const INITIAL_COLUMN_PLACEHOLDERS = 4;
const IMPORT_FILE_PATH = path.join(__dirname, 'imports', 'customers.csv');

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const esql = getService('esql');
  const es = getService('es');
  const retry = getService('retry');
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');

  const { indexEditor, common, discover } = getPageObjects([
    'indexEditor',
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
    'unifiedFieldList',
    'unifiedSearch',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    enableESQL: true,
  };

  describe('Index editor', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['superuser']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');

      // Set ESQL mode
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.waitUntilSearchingHasFinished();
    });

    beforeEach(async () => {
      await cleanLookupJoinIndexes();
    });

    afterEach(async () => {
      await cleanLookupJoinIndexes();
    });

    it('allows creation by file upload', async function () {
      // Type lookup join query with index name inside it
      await monacoEditor.setCodeEditorValue('');
      await monacoEditor.typeCodeEditorValue(
        `from logstash-* | LOOKUP JOIN ${INDEX_NAME_FILE}`,
        'ESQLEditor'
      );

      // Click Create lookup index suggestion
      await esql.selectEsqlSuggestionByLabel(`Create lookup index "${INDEX_NAME_FILE}"`);
      await testSubjects.isDisplayed('lookupIndexFlyout');

      // Import a file
      await indexEditor.uploadFile(IMPORT_FILE_PATH);
      await testSubjects.isDisplayed('indexEditorPreviewFile');
      await testSubjects.click('indexEditorImportButton');

      // Check data grid has been populated correctly
      await retry.tryForTime(6000, async () => {
        const gridData = await dataGrid.getDataGridTableData();
        expect(gridData.columns).to.eql([
          'Select column',
          'Keywordcustomer_first_name',
          'Keywordcustomer_full_name',
          'Keywordcustomer_gender',
          'Numbercustomer_id',
          'Keywordcustomer_last_name',
          'Keywordemail',
        ]);
        expect(gridData.rows[0]).to.eql([
          '', // toggles column
          'Elyssa',
          'Elyssa Underwood',
          'FEMALE',
          27,
          'Underwood',
          'elyssa@underwood-family.zzz',
        ]);
      });

      // Close flyout and verify index content is correct
      await indexEditor.closeIndexEditor();
      await testSubjects.waitForDeleted('lookupIndexFlyout');

      await retry.tryForTime(6000, async () => {
        await indexEditor.verifyIndexContent(INDEX_NAME_FILE, [
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
    });

    it('allows creation by manually adding data', async function () {
      // Type lookup join query
      await monacoEditor.setCodeEditorValue('');
      await monacoEditor.typeCodeEditorValue('from logstash-* | LOOKUP JOIN ', 'ESQLEditor');

      // Click Create lookup index suggestion
      await esql.selectEsqlSuggestionByLabel('Create lookup index');

      // Set index name
      await testSubjects.setValue('indexNameInput', INDEX_NAME_MANUAL);
      await testSubjects.click('indexNameSaveButton');

      // Set column names
      expect((await indexEditor.getColumnNames()).length).to.be(INITIAL_COLUMN_PLACEHOLDERS);

      for (let index = 0; index < INITIAL_COLUMN_PLACEHOLDERS; index++) {
        await indexEditor.setColumnName(`column-${index + 1}`, index);
      }

      expect(await indexEditor.getColumnNames()).to.eql([
        'column-1',
        'column-2',
        'column-3',
        'column-4',
      ]);

      // Add a new column
      await indexEditor.addColumn();
      await indexEditor.setColumnName(`extra-column`, 4);
      expect((await indexEditor.getColumnNames()).length).to.be(INITIAL_COLUMN_PLACEHOLDERS + 1);

      // Add another column and then delete it
      await indexEditor.addColumn();
      await indexEditor.setColumnName(`column-to-be-deleted`, 5);
      await indexEditor.deleteColumn('column-to-be-deleted');
      expect((await indexEditor.getColumnNames()).length).to.be(INITIAL_COLUMN_PLACEHOLDERS + 1);

      // Add cell values for the first row
      for (let colIndex = 1; colIndex <= 5; colIndex++) {
        await indexEditor.setCellValue(0, colIndex, `value-1-${colIndex}`);
      }

      // Add new row with values
      await indexEditor.addRow();
      for (let colIndex = 1; colIndex <= 5; colIndex++) {
        await indexEditor.setCellValue(0, colIndex, `value-2-${colIndex}`);
      }

      // Edit column name
      await indexEditor.setColumnName('renamed-column-1', 0);

      // Save the index
      await indexEditor.saveChangesAndClose();

      // Query should be updated appending the new index name
      const updatedESQLQuery = await esql.getEsqlEditorQuery();
      expect(updatedESQLQuery).to.contain(`| LOOKUP JOIN ${INDEX_NAME_MANUAL}`);

      // Verify the index is created correctly and contains all the data
      await retry.tryForTime(6000, async () => {
        await indexEditor.verifyIndexContent(INDEX_NAME_MANUAL, [
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
      });
    });

    it('allows editing an existing index', async function () {
      // Create the lookup join index
      await es.indices.create({
        index: INDEX_NAME_EDITION,
        settings: {
          mode: 'lookup',
        },
      });

      await es.bulk({
        index: INDEX_NAME_EDITION,
        operations: [
          {
            index: { _id: '1' },
          },
          {
            customer_first_name: 'Elyssa',
            customer_full_name: 'Elyssa Underwood',
            customer_gender: 'FEMALE',
            customer_id: '27',
            customer_last_name: 'Underwood',
            email: 'elyssa@underwood-family.zzz',
          },
          {
            index: { _id: '2' },
          },
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
      await browser.refresh();

      // Type lookup join query
      await monacoEditor.setCodeEditorValue('');
      await monacoEditor.typeCodeEditorValue(
        `from logstash-* | LOOKUP JOIN ${INDEX_NAME_EDITION}`,
        'ESQLEditor'
      );

      // Hover the index badge and click on the edit option
      await esql.selectEsqlBadgeHoverOption('lookupIndexBadge', 'Edit lookup index');

      expect(await testSubjects.isDisplayed('lookupIndexFlyout')).to.be(true);

      expect((await dataGrid.getDocTableRows()).length).to.be(2);

      // Filter rows
      await indexEditor.search('Elyssa');
      await retry.tryForTime(6000, async () => {
        expect((await dataGrid.getDocTableRows()).length).to.be(1);
      });
      await indexEditor.search('');
      await retry.tryForTime(6000, async () => {
        expect((await dataGrid.getDocTableRows()).length).to.be(2);
      });

      // Edit cell values
      await indexEditor.setCellValue(0, 1, 'Jasmin');
      await indexEditor.setCellValue(0, 2, 'Jasmin Upperwood');

      await indexEditor.setCellValue(1, 1, 'Philip');
      await indexEditor.setCellValue(1, 2, 'Philip Tompsoon');

      // Add a new row with some values and delete it
      await indexEditor.addRow();
      await indexEditor.setCellValue(0, 1, 'New Name');
      await indexEditor.setCellValue(0, 2, 'New Name Surname');
      expect((await dataGrid.getDocTableRows()).length).to.be(3);

      await indexEditor.deleteRow(0);
      expect((await dataGrid.getDocTableRows()).length).to.be(2);

      // Add a new row with some values
      await indexEditor.addRow();
      await indexEditor.setCellValue(0, 1, 'Pedro');
      await indexEditor.setCellValue(0, 2, 'Pedro Fernandez');
      expect((await dataGrid.getDocTableRows()).length).to.be(3);

      // Add a new column
      await indexEditor.addColumn();
      await indexEditor.setColumnName('age', 0); // it's cero because there is only one editable column
      await indexEditor.setCellValue(0, 7, '30');
      await indexEditor.setCellValue(1, 7, '40');
      await indexEditor.setCellValue(2, 7, '25');

      // Try to exit without saving changes
      await indexEditor.closeIndexEditor();
      await testSubjects.exists('indexEditorUnsavedChangesModal');

      // Go back to save
      await testSubjects.click('confirmModalCancelButton');
      await testSubjects.waitForDeleted('indexEditorUnsavedChangesModal');
      await indexEditor.saveChangesAndClose();

      // Verify the editions took place correctly
      await retry.tryForTime(10000, async () => {
        await indexEditor.verifyIndexContent(INDEX_NAME_EDITION, [
          {
            customer_first_name: 'Jasmin',
            customer_full_name: 'Jasmin Upperwood',
            customer_gender: 'FEMALE',
            customer_id: '27',
            customer_last_name: 'Underwood',
            email: 'elyssa@underwood-family.zzz',
            age: 40,
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
            age: 30,
          },
        ]);
      });
    });

    it('allows to save an edition without closing the flyout', async () => {
      // Type lookup join query with index name inside it
      await monacoEditor.setCodeEditorValue('');
      await monacoEditor.typeCodeEditorValue(
        `from logstash-* | LOOKUP JOIN ${INDEX_NAME_MANUAL}`,
        'ESQLEditor'
      );

      // Click Create lookup index suggestion
      await esql.selectEsqlSuggestionByLabel(`Create lookup index "${INDEX_NAME_MANUAL}"`);
      await testSubjects.isDisplayed('lookupIndexFlyout');

      // Manually set content
      await indexEditor.setColumnName(`my_column`, 0);
      await indexEditor.setCellValue(0, 1, `value`);

      // Save changes
      await indexEditor.saveChanges();

      // Verify the editions took place correctly
      await retry.tryForTime(10000, async () => {
        await indexEditor.verifyIndexContent(INDEX_NAME_MANUAL, [
          {
            my_column: 'value',
          },
        ]);
      });
    });
  });

  async function cleanLookupJoinIndexes() {
    for (const name of [INDEX_NAME_EDITION, INDEX_NAME_MANUAL, INDEX_NAME_FILE]) {
      const indexExists = await es.indices.exists({ index: name });
      if (indexExists) {
        await es.indices.delete({ index: name });
      }
    }
  }
}
