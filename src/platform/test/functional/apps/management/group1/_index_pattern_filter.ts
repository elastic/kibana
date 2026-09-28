/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. Delete type, schema, and text filtering because
 * indexed_fields_table.test.tsx already covers the same filtering behavior. Move the conflict
 * button's filter-reset behavior to a Jest component test. The nearly identical serverless FTR
 * suite at x-pack/platform/test/serverless/functional/test_suites/management/data_views/
 * _index_pattern_filter.ts should be deleted alongside this one after the retained behavior is
 * covered at the appropriate layer.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['settings', 'header']);
  const es = getService('es');

  describe('index pattern filter', function describeIndexTests() {
    let logstashDataViewId: string;

    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      logstashDataViewId = await PageObjects.settings.createIndexPattern('logstash-*');
    });

    after(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.settings.removeIndexPattern();
    });

    /**
     * Migration recommendation: DELETE. indexed_fields_table/indexed_fields_table.test.tsx already
     * verifies filtering by field type; the FTR variation only changes mocks to logstash data.
     */
    it('should filter indexed fields by type', async function () {
      await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
      await PageObjects.settings.getFieldTypes();
      await PageObjects.settings.setFieldTypeFilter('keyword');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('keyword');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('keyword');

      await PageObjects.settings.setFieldTypeFilter('long');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('long');
        }
      });
      await PageObjects.settings.clearFieldTypeFilter('long');
    });

    /**
     * Migration recommendation: DELETE. indexed_fields_table/indexed_fields_table.test.tsx already
     * verifies the runtime schema filter and its visible/hidden field result.
     */
    it('should filter indexed fields by schema type', async function () {
      await PageObjects.settings.navigateToDataViewById(logstashDataViewId);

      await PageObjects.settings.addRuntimeField('_test', 'keyword', "emit('hi')");

      const unfilteredFields = [
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

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);

      await PageObjects.settings.setSchemaFieldTypeFilter('runtime');

      expect(await PageObjects.settings.getFieldNames()).to.eql(['_test']);

      await PageObjects.settings.setSchemaFieldTypeFilter('indexed');

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);
    });

    /**
     * Migration recommendation: DELETE. indexed_fields_table/indexed_fields_table.test.tsx already
     * verifies query-bar filtering. The exact logstash names and tab count add no coverage.
     */
    it('should filter indexed fields when searched', async function () {
      await PageObjects.settings.navigateToDataViewById(logstashDataViewId);

      const unfilteredFields = [
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

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);

      await PageObjects.settings.filterField('@');

      expect(await PageObjects.settings.getFieldNames()).to.eql([
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        '@timestamp',
      ]);

      await PageObjects.settings.filterField('@message');

      expect(await PageObjects.settings.getFieldNames()).to.eql(['@message', '@message.raw']);

      expect(
        (await testSubjects.getVisibleText('tab-indexedFields')).startsWith('Fields (2 /')
      ).to.be(true);

      await testSubjects.click('clearSearchButton');

      expect(await PageObjects.settings.getFieldNames()).to.eql(unfilteredFields);
    });

    /**
     * Migration recommendation: MIGRATE TO JEST. Conflict rendering is already covered by the
     * indexed-fields table tests; add this button's filter-reset and conflict-only assertions to
     * indexed_fields_table/indexed_fields_table.test.tsx with mocked conflicting fields.
     */
    it('should set "conflict" filter when "View conflicts" button is pressed', async function () {
      const additionalIndexWithWrongMapping = 'logstash-wrong';

      if (await es.indices.exists({ index: additionalIndexWithWrongMapping })) {
        await es.indices.delete({ index: additionalIndexWithWrongMapping });
      }

      await es.indices.create({
        index: additionalIndexWithWrongMapping,
        mappings: {
          properties: {
            bytes: {
              type: 'keyword',
            },
          },
        },
      });

      await es.index({
        index: additionalIndexWithWrongMapping,
        document: {
          bytes: 'wrong_value',
        },
        refresh: 'wait_for',
      });

      await PageObjects.settings.navigateToDataViewById(logstashDataViewId);

      await PageObjects.settings.refreshDataViewFieldList();

      await testSubjects.existOrFail('dataViewMappingConflict');

      expect(await PageObjects.settings.getFieldTypes()).to.eql([
        'text',
        'keyword',
        'text',
        'keyword',
        'date',
        '_id',
        '_ignored',
        '_index',
        '',
        '_source',
      ]);

      // set other filters to check if they get reset after pressing the button
      await PageObjects.settings.filterField('unknown');
      await PageObjects.settings.setFieldTypeFilter('text');
      await PageObjects.settings.setSchemaFieldTypeFilter('runtime');
      expect(await PageObjects.settings.getFieldTypes()).to.eql([]);

      // check that only a conflicting field is shown
      await testSubjects.click('viewDataViewMappingConflictsButton');
      expect(await PageObjects.settings.getFieldTypes()).to.eql(['keyword, long\nConflict']);
      expect(await PageObjects.settings.getFieldNames()).to.eql(['bytes']);

      await es.indices.delete({ index: additionalIndexWithWrongMapping });
    });
  });
}
