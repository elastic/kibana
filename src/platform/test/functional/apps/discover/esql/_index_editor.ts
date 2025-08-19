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

const INDEX_NAME = 'test-lookup-index';
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
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
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

    afterEach(async () => {
      const indexExists = await es.indices.exists({ index: INDEX_NAME });
      if (indexExists) {
        await es.indices.delete({ index: INDEX_NAME });
      }
    });

    describe('Index creation', function () {
      beforeEach(async () => {
        await monacoEditor.setCodeEditorValue('');
        await monacoEditor.typeCodeEditorValue('from logstash-* | LOOKUP JOIN ', 'ESQLEditor');

        // Click Create lookup index suggestion
        await monacoEditor.selectSuggestionByIndex(0);

        // Set index name
        await testSubjects.setValue('indexNameInput', INDEX_NAME);
        await testSubjects.click('indexNameSaveButton');
      });

      it('allows creation by manually adding data', async function () {
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
        await indexEditor.saveChanges();

        // Query should be updated appending the new index name
        const updatedESQLQuery = await esql.getEsqlEditorQuery();
        expect(updatedESQLQuery).to.contain(`| LOOKUP JOIN ${INDEX_NAME}`);

        // Verify the index is created correctly and contains all the data
        await indexEditor.verifyIndexContent(INDEX_NAME, [
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

      it('allows creation by file upload', async function () {
        await indexEditor.uploadFile(IMPORT_FILE_PATH);

        await testSubjects.isDisplayed('indexEditorPreviewFile');

        await testSubjects.click('indexEditorImportButton');
      });
    });
  });
}
