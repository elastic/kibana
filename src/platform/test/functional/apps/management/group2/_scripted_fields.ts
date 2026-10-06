/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Tests for 4 scripted fields;
// 1. Painless (number type)
// 2. Painless (string type)
// 3. Painless (boolean type)
// 4. Painless (date type)
//
// Each of these scripted fields has 4 tests (12 tests total);
// 1. Create scripted field
// 2. See the expected value of the scripted field in Discover doc view
// 3. Filter in Discover by the scripted field
// 4. Visualize with aggregation on the scripted field by clicking unifiedFieldList.clickFieldListItemVisualize

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. Migrate to one stateful-only Scout spec (scripted fields are
 * disabled in serverless, see data_views scripted_fields_disabled.spec.ts). It covers UI creation
 * once, plus how Elasticsearch executes each scripted-field type in Discover: rendered value,
 * `_script` sort, and script filter. Existing coverage only checks request shape (Jest:
 * normalize_sort_request.test.ts, kbn-es-query phrase_filter.test.ts / range_filter.test.ts) or
 * error paths (Scout discover error_handling.spec.ts, async_scripted_fields.spec.ts). None of them
 * checks a scripted field's value, sort order, or filtered hit count. Delete the repeated UI
 * creation for string/boolean/date (create those fields through the data views API in setup), the
 * per-type Lens hand-offs after the numeric one, and the two long-skipped sort tests.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'settings',
    'visualize',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);

  describe('scripted fields', function () {
    this.tags(['skipFirefox']);

    let logstashDataViewId: string;

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
      // Navigate once to capture the actual data view ID (importExport may assign a new UUID).
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      logstashDataViewId = await PageObjects.settings.getIndexPatternIdFromUrl();
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
      await PageObjects.common.unsetTime();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Save runs isScriptValid(), which posts to
     * /internal/index-pattern-management/preview_scripted_field, so a real painless compile error
     * from Elasticsearch has to surface as `invalidScriptError`. The route's Jest test mocks the ES
     * client, and field_editor.test.tsx never saves. This is also the only real-ES coverage of the
     * preview route, which lets _scripted_fields_preview.ts move to Jest.
     */
    it('should not allow saving of invalid scripts', async function () {
      await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
      await PageObjects.settings.goToAddScriptedField();
      await PageObjects.settings.setScriptedFieldName('doomedScriptedField');
      await PageObjects.settings.setScriptedFieldScript(`i n v a l i d  s c r i p t`);
      await PageObjects.settings.clickSaveScriptedField();
      await retry.try(async () => {
        const invalidScriptErrorExists = await testSubjects.exists('invalidScriptError');
        expect(invalidScriptErrorExists).to.be(true);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Regression for #33251: saving a scripted field
     * serialised its format so that re-opening it crashed the editor (`field.format.params is
     * not a function`). Catching it needs repeated save → reload-from-saved-object → edit cycles,
     * which a mocked Jest render of field_editor.tsx does not do. Fold this in as a step of the
     * numeric "should create scripted field" test instead of creating a separate field.
     */
    describe('testing regression for issue #33251', function describeIndexTests() {
      const scriptedPainlessFieldName = 'ram_Pain_reg';

      it('should create and edit scripted field', async function () {
        await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await log.debug('add scripted field');
        const script = `1`;
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName,
          'painless',
          'number',
          null,
          '1',
          script
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });

        for (let i = 0; i < 3; i++) {
          await PageObjects.settings.editScriptedField(scriptedPainlessFieldName);
          await testSubjects.existOrFail('fieldSaveButton');
          await PageObjects.settings.clickSaveScriptedField();
        }
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. This is the full UI journey for one scripted field:
     * create it through the management form, then use it in Discover (value, sort, filter, Lens).
     */
    describe('creating and using Painless numeric scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName = 'ram_Pain1';

      /**
       * Migration recommendation: MIGRATE TO SCOUT. This is the one place that creates a scripted
       * field through the management form (name, language, type, popularity, script) and checks
       * that it is persisted.
       */
      it('should create scripted field', async function () {
        await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await log.debug('add scripted field');
        const script = `if (doc['machine.ram'].size() == 0) return -1;
          else return doc['machine.ram'].value / (1024 * 1024 * 1024);
        `;
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName,
          'painless',
          'number',
          null,
          '100',
          script
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      describe('discover scripted field', () => {
        before(async () => {
          const from = 'Sep 17, 2015 @ 06:31:44.000';
          const to = 'Sep 18, 2015 @ 18:31:44.000';
          await PageObjects.common.setTime({ from, to });
        });

        /**
         * Migration recommendation: MIGRATE TO SCOUT. Adding the field as a column sends it as a
         * `script_fields` entry, and the value Elasticsearch computes must render in the grid.
         */
        it('should see scripted field value in Discover', async function () {
          await PageObjects.common.navigateToApp('discover');

          await retry.try(async function () {
            await PageObjects.unifiedFieldList.clickFieldListItemAdd(scriptedPainlessFieldName);
          });
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async function () {
            const rowData = (await dataGrid.getRowsText())[0];
            expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.91618');
          });
        });

        /**
         * Migration recommendation: MIGRATE TO SCOUT. A numeric scripted field sorts through a
         * `_script` sort with `type: number`. normalize_sort_request.test.ts only checks the
         * request shape, so this is the only check that Elasticsearch actually orders by it.
         * Drop the fixed sleep.
         */
        // add a test to sort numeric scripted field
        it('should sort scripted field value in Discover', async function () {
          await dataGrid.clickColumnActionAt(scriptedPainlessFieldName, 1);
          await PageObjects.common.sleep(500);

          // after the first click on the scripted field, it becomes secondary sort after time.
          // click on the timestamp twice to make it be the secondary sort key.
          await dataGrid.clickColumnActionAt('@timestamp', 1);
          await dataGrid.clickColumnActionAt('@timestamp', 0);

          await PageObjects.header.waitUntilLoadingHasFinished();
          await retry.try(async function () {
            const rowData = (await dataGrid.getRowsText())[0];
            expect(rowData).to.be('Sep 17, 2015 @ 10:53:14.181-1');
          });

          await dataGrid.clickColumnActionAt(scriptedPainlessFieldName, 2);
          // after the first click on the scripted field, it becomes primary sort after time.
          // click on the scripted field twice then, makes it be the secondary sort key.
          await dataGrid.clickColumnActionAt(scriptedPainlessFieldName, 2);
          await dataGrid.clickColumnActionAt(scriptedPainlessFieldName, 2);

          await PageObjects.header.waitUntilLoadingHasFinished();
          await retry.try(async function () {
            const rowData = (await dataGrid.getRowsText())[0];
            expect(rowData).to.be('Sep 17, 2015 @ 06:32:29.47920');
          });
        });

        /**
         * Migration recommendation: MIGRATE TO SCOUT. Filtering from the field popover's top
         * values builds a painless script phrase filter with numeric conversion. Jest
         * (phrase_filter.test.ts) covers the filter shape; only e2e checks the 31 hits.
         */
        it('should filter by scripted field value in Discover', async function () {
          await PageObjects.unifiedFieldList.clickFieldListItem(scriptedPainlessFieldName);
          await log.debug('filter by the first value (14) in the expanded scripted field list');
          await PageObjects.unifiedFieldList.clickFieldListPlusFilter(
            scriptedPainlessFieldName,
            '14'
          );
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async function () {
            expect(await PageObjects.discover.getHitCount()).to.be('31');
          });
        });

        /**
         * Migration recommendation: MIGRATE TO SCOUT. Checks that a scripted field reaches Lens
         * from Discover's "Visualize" button. Discover's visualize_field.spec.ts only uses mapped
         * fields. Keep this numeric case as the single scripted-field check of that hand-off.
         */
        it('should visualize scripted field in vertical bar chart', async function () {
          await filterBar.removeAllFilters();
          await PageObjects.unifiedFieldList.clickFieldListItemVisualize(scriptedPainlessFieldName);
          await PageObjects.header.waitUntilLoadingHasFinished();
          // verify Lens opens a visualization
          await retry.waitFor('lens visualization', async () => {
            const elements = await testSubjects.getVisibleTextAll('lns-dimensionTrigger');
            return elements[0] === '@timestamp' && elements[1] === 'Median of ram_Pain1';
          });
        });
      });

      after(async () => {
        await PageObjects.common.unsetTime();
      });
    });

    /**
     * Migration recommendation: MIXED. Keep the string-specific Elasticsearch behavior (value,
     * `_script` sort with `type: string`, and string script filter) in Scout. Delete the second UI
     * creation and the second Lens hand-off.
     */
    describe('creating and using Painless string scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painString';

      before(async () => {
        const from = 'Sep 17, 2015 @ 06:31:44.000';
        const to = 'Sep 18, 2015 @ 18:31:44.000';
        await PageObjects.common.setTime({ from, to });
      });

      /**
       * Migration recommendation: DELETE. This repeats the UI creation journey covered by the
       * numeric block. In Scout, create `painString` through the data views API in setup.
       */
      it('should create scripted field', async function () {
        await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'string',
          null,
          '1',
          "if (doc['response.raw'].value == '200') { return 'good'} else { return 'bad'}"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A string-returning painless script must
       * render its computed `good`/`bad` value in the grid.
       */
      it('should see scripted field value in Discover', async function () {
        await PageObjects.common.navigateToApp('discover');

        await retry.try(async function () {
          await PageObjects.unifiedFieldList.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = (await dataGrid.getRowsText())[0];
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916good');
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A string scripted field sorts with a `_script`
       * sort of `type: string`, a different Elasticsearch path from the numeric one. Drop the fixed
       * sleep and the commented-out legacy doc table click.
       */
      // add a test to sort string scripted field
      it('should sort scripted field value in Discover', async function () {
        await dataGrid.clickColumnActionAt(scriptedPainlessFieldName2, 1);
        // await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.common.sleep(500);

        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await dataGrid.clickColumnActionAt('@timestamp', 1);
        await dataGrid.clickColumnActionAt('@timestamp', 0);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = (await dataGrid.getRowsText())[0];
          expect(rowData).to.be('Sep 17, 2015 @ 09:48:40.594bad');
        });

        await dataGrid.clickColumnActionAt(scriptedPainlessFieldName2, 2);
        // after the first click on the scripted field, it becomes primary sort after time.
        // click on the scripted field twice then, makes it be the secondary sort key.
        await dataGrid.clickColumnActionAt(scriptedPainlessFieldName2, 2);
        await dataGrid.clickColumnActionAt(scriptedPainlessFieldName2, 2);

        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = (await dataGrid.getRowsText())[0];
          expect(rowData).to.be('Sep 17, 2015 @ 06:32:29.479good');
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A string script phrase filter (no numeric
       * conversion) executed by Elasticsearch must return 27 hits.
       */
      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.unifiedFieldList.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "bad" in the expanded scripted field list');
        await PageObjects.unifiedFieldList.clickFieldListPlusFilter(
          scriptedPainlessFieldName2,
          'bad'
        );
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('27');
        });
        await filterBar.removeAllFilters();
      });

      /**
       * Migration recommendation: DELETE. The numeric block's Lens test already covers the
       * scripted-field hand-off. Choosing "Top values" for a string field is Lens suggestion logic,
       * covered by form_based_suggestions.test.tsx.
       */
      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.unifiedFieldList.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        await retry.waitFor('lens visualization', async () => {
          const elements = await testSubjects.getVisibleTextAll('lns-dimensionTrigger');
          return elements[0] === 'Top 9 values of painString';
        });
      });

      after(async () => {
        await PageObjects.common.unsetTime();
      });
    });

    /**
     * Migration recommendation: MIXED. Keep value rendering and the boolean script filter in Scout.
     * Delete the UI creation, the skipped sort test, and the Lens hand-off.
     */
    describe('creating and using Painless boolean scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painBool';

      before(async () => {
        const from = 'Sep 17, 2015 @ 06:31:44.000';
        const to = 'Sep 18, 2015 @ 18:31:44.000';
        await PageObjects.common.setTime({ from, to });
      });

      /**
       * Migration recommendation: DELETE. This repeats the UI creation journey covered by the
       * numeric block. In Scout, create `painBool` through the data views API in setup.
       */
      it('should create scripted field', async function () {
        await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'boolean',
          null,
          '1',
          "doc['response.raw'].value == '200'"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. A boolean-returning script must render
       * `true`/`false` in the grid.
       */
      it('should see scripted field value in Discover', async function () {
        await PageObjects.common.navigateToApp('discover');

        await retry.try(async function () {
          await PageObjects.unifiedFieldList.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = (await dataGrid.getRowsText())[0];
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916true');
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Filtering on a boolean script value from the
       * field popover must return 359 hits from Elasticsearch.
       */
      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.unifiedFieldList.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "true" in the expanded scripted field list');
        await PageObjects.unifiedFieldList.clickFieldListPlusFilter(
          scriptedPainlessFieldName2,
          'true'
        );
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('359');
        });
        await filterBar.removeAllFilters();
      });

      /**
       * Migration recommendation: DELETE. This has been skipped since #75519, which was closed
       * without a fix (scripted fields are not sortable in that context). It still targets the
       * removed legacy doc table (`docTableHeaderFieldSort_*`) and has placeholder expectations.
       */
      // add a test to sort boolean
      // existing bug: https://github.com/elastic/kibana/issues/75519 hence the issue is skipped.
      it.skip('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('updateExpectedResultHere\ntrue');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('updateExpectedResultHere\nfalse');
        });
      });

      /**
       * Migration recommendation: DELETE. The numeric block's Lens test already covers the
       * scripted-field hand-off. The boolean "Top values" choice is covered by
       * form_based_suggestions.test.tsx.
       */
      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.unifiedFieldList.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        await retry.waitFor('lens visualization', async () => {
          const elements = await testSubjects.getVisibleTextAll('lns-dimensionTrigger');
          return elements[0] === 'Top 9 values of painBool';
        });
      });

      after(async () => {
        await PageObjects.common.unsetTime();
      });
    });

    /**
     * Migration recommendation: MIXED. Keep value rendering with the field's custom date format,
     * and filtering from a grid cell, in Scout. Delete the UI creation, the skipped sort test, and
     * the Lens hand-off.
     */
    describe('creating and using Painless date scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painDate';

      before(async () => {
        const from = 'Sep 17, 2015 @ 19:22:00.000';
        const to = 'Sep 18, 2015 @ 07:00:00.000';
        await PageObjects.common.setTime({ from, to });
      });

      /**
       * Migration recommendation: DELETE. This repeats the UI creation journey covered by the
       * numeric block. In Scout, create `painDate` through the data views API in setup, with its
       * `date` format (`YYYY-MM-DD HH:00`) in `fieldFormats`, so the display test below still
       * checks that the scripted field's format is applied.
       */
      it('should create scripted field', async function () {
        await PageObjects.settings.navigateToDataViewById(logstashDataViewId);
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'date',
          { format: 'date', datePattern: 'YYYY-MM-DD HH:00' },
          '1',
          "doc['utc_time'].value.toEpochMilli() + (1000) * 60 * 60"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. The date script's value must render with the
       * scripted field's own `YYYY-MM-DD HH:00` format. That format is set up through the API once
       * the UI creation above is deleted.
       */
      it('should see scripted field value in Discover', async function () {
        await PageObjects.common.navigateToApp('discover');

        await retry.try(async function () {
          await PageObjects.unifiedFieldList.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = (await dataGrid.getRowsText())[0];
          expect(rowData).to.be('Sep 18, 2015 @ 06:52:55.9532015-09-18 07:00');
        });
      });

      /**
       * Migration recommendation: DELETE. This has been skipped since #75711 (closed; the answer was
       * runtime fields). normalize_sort_request.ts deliberately never emits a `_script` sort for
       * date scripted fields. It also targets the removed legacy doc table and has placeholder
       * expectations.
       */
      // add a test to sort date scripted field
      // https://github.com/elastic/kibana/issues/75711
      it.skip('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('updateExpectedResultHere\n2015-09-18 07:00');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('updateExpectedResultHere\n2015-09-18 07:00');
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. This is the only case that filters from the
       * data grid's cell "Filter for" action rather than the field popover, on a date script,
       * and gets 1 hit back from Elasticsearch.
       */
      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 1);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
        await filterBar.removeAllFilters();
      });

      /**
       * Migration recommendation: DELETE. The numeric block's Lens test already covers the
       * scripted-field hand-off. The date dimension choice is covered by
       * form_based_suggestions.test.tsx.
       */
      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.unifiedFieldList.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        await retry.waitFor('lens visualization', async () => {
          const elements = await testSubjects.getVisibleTextAll('lns-dimensionTrigger');
          return elements[0] === 'painDate';
        });
      });
    });
  });
}
