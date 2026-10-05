/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. Retain Scout coverage for creation, edit, deletion, routing,
 * and persisted advanced settings. Move local form validation and static table structure to Jest.
 * The existing create_data_view_wizard.spec.ts covers only
 * data-stream creation and navigation; it does not cover these index-pattern flows. A
 * near-identical serverless FTR suite exists at
 * x-pack/platform/test/serverless/functional/test_suites/management/data_views/
 * _data_view_create_delete.ts; migrate the shared scenarios once with appropriate deployment
 * tags, then delete both FTR copies after parity is established.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const es = getService('es');
  const flyout = getService('flyout');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);

  describe('creating and deleting default data view', function describeIndexTests() {
    before(async function () {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });

    after(async function () {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights_index_pattern'
      );

      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
    });

    describe('can open and close editor', function () {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Opening the editor from Data Views and
       * returning to the list validates application navigation and flyout wiring, not just EUI's
       * close behavior.
       */
      it('without creating index pattern', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await flyout.closeFlyout();
        await testSubjects.find('createDataViewButton');
      });
    });

    describe('validation', function () {
      /**
       * Migration recommendation: MIGRATE TO JEST. Invalid-title feedback is component-local
       * validation. Add a data_view_editor_flyout_content.test.tsx beside
       * src/platform/plugins/shared/data_view_editor/public/components/data_view_editor_flyout_content.tsx
       * and cover the form's error state with mocked matching sources instead of a browser test.
       */
      it('can display errors', async function () {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.settings.setIndexPatternField('log-fake*');
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        await find.byClassName('euiFormErrorText');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Resolving the validation state and saving a
       * data view crosses the editor, Data Views API, and detail-page navigation.
       */
      it('can resolve errors and submit', async function () {
        await PageObjects.settings.setIndexPatternField('log*');
        await new Promise((e) => setTimeout(e, 500));
        await (await PageObjects.settings.getSaveDataViewButtonActive()).click();
        await PageObjects.settings.removeIndexPattern();
      });

      /**
       * Migration recommendation: MIGRATE TO JEST. This must exercise the editor's debounced
       * title → dataViewEditorService.setIndexPattern() → timestamp-options path, not the
       * timestamp validator with fixed options. Add data_view_editor_flyout_content.test.tsx beside
       * the editor component and mock source responses for `log*` then `kibana*`.
       */
      it('correctly validates timestamp after index pattern changes', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        // setting the index pattern also sets the time field
        await PageObjects.settings.setIndexPatternField('log*');
        // wait for timestamp fields to load
        await new Promise((e) => setTimeout(e, 1000));
        // this won't have 'timestamp' field
        await PageObjects.settings.setIndexPatternField('kibana*');
        // wait for other date fields to load
        await new Promise((e) => setTimeout(e, 1000));
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        // verify an error is displayed
        await find.byClassName('euiFormErrorText');
        await flyout.closeFlyout();
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. In addition to resetting the editor state,
       * this saves the data view and confirms its detail page has no current time field. A mocked
       * timestamp component cannot prove the cleared value reaches Kibana persistence.
       */
      it('correctly resets time field after index pattern changes', async function () {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        // setting the index pattern also sets the time field
        await PageObjects.settings.setIndexPatternField('log*');
        // wait for date fields to load
        await retry.waitFor('time field', async () => {
          const timeFieldInput = await PageObjects.settings.getTimeFieldNameField();
          return (await timeFieldInput.getAttribute('value')) === '@timestamp';
        });
        // this won't have any date fields
        await PageObjects.settings.setIndexPatternField('without-timefield');
        // wait for the dropdown to get disabled
        await retry.waitFor('no time field', async () => {
          const timeFieldInput = await PageObjects.settings.getTimeFieldNameField();
          return !(await timeFieldInput.getAttribute('value'));
        });
        await (await PageObjects.settings.getSaveIndexPatternButton()).click();
        await retry.try(async () => {
          expect(await testSubjects.getVisibleText(APP_HEADER_TEST_SUBJECTS.title)).to.be(
            'without-timefield'
          );
        });
        await testSubjects.missingOrFail('currentIndexPatternTimeField');
        await PageObjects.settings.clickKibanaIndexPatterns();
      });
    });

    describe('special character handling', () => {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Entering a Unicode expression in the editor
       * and resolving its unmatched-source status exercises the actual input, asynchronous source
       * lookup, and rendered result. A status-message test with mocked props would miss that path.
       */
      it('should handle special charaters in template input', async () => {
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.settings.setIndexPatternField('❤️');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('createIndexPatternStatusMessage')).to.contain(
            `The index pattern you entered doesn\'t match any data streams, indices, or index aliases.`
          );
        });
      });

      after(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
      });
    });

    describe('index pattern creation', function indexPatternCreation() {
      let indexPatternId: string;

      before(function () {
        return PageObjects.settings
          .createIndexPattern('logstash-*')
          .then((id) => (indexPatternId = id));
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. The title shown after a saved data view
       * verifies the create-to-detail user journey.
       */
      it('should have index pattern in page header', async function () {
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('logstash-*');
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. The generated detail URL is application
       * routing behavior and is meaningful only in a browser journey.
       */
      it('should have index pattern in url', function url() {
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            expect(currentUrl).to.contain(indexPatternId);
          });
        });
      });

      /**
       * Migration recommendation: MIGRATE TO JEST. The indexed-fields table header is static
       * component structure; assert it in src/platform/plugins/shared/data_view_management/public/
       * components/edit_index_pattern/indexed_fields_table/components/table/table.test.tsx instead
       * of through FTR.
       */
      it('should have expected table headers', function checkingHeader() {
        return PageObjects.settings.getTableHeader().then(function (headers) {
          log.debug('header.length = ' + headers.length);
          const expectedHeaders = [
            'Name',
            'Type',
            'Format',
            'Searchable',
            'Aggregatable',
            'Excluded',
            'Actions',
          ];

          expect(headers.length).to.be(expectedHeaders.length);

          const comparedHeaders = headers.map(function compareHead(header, i) {
            return header.getVisibleText().then(function (text) {
              expect(text).to.be(expectedHeaders[i]);
            });
          });

          return Promise.all(comparedHeaders);
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Saving a data view whose expression has an
       * unmatched segment validates the editor's real source matching and save journey.
       */
      it('should support unmatched index pattern segments', async function () {
        await PageObjects.settings.createIndexPattern('l*,z*', '@timestamp');
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be('l*,z*');
        await PageObjects.settings.removeIndexPattern();
      });
    });

    describe('edit index pattern', () => {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Editing a persisted data view from its
       * detail page and observing the new title is a complete user journey.
       */
      it('on edit click', async () => {
        await testSubjects.click('detail-link-logstash-*');
        await PageObjects.settings.editIndexPattern('logstash-*', '@timestamp', 'Logstash Star');

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText(APP_HEADER_TEST_SUBJECTS.title)).to.contain(
            `Logstash Star`
          );
        });
      });
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Saving an edit with the same display name
       * exercises persisted-data-view update behavior and the confirmation path.
       */
      it('can save with same name', async () => {
        await PageObjects.settings.editIndexPattern(
          'logstash-*,hello_world*',
          '@timestamp',
          'Logstash Star',
          true
        );

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText(APP_HEADER_TEST_SUBJECTS.title)).to.contain(
            `Logstash Star`
          );
        });
      });
      /**
       * Migration recommendation: MIGRATE TO SCOUT. The confirmation path for changing the
       * index expression and display name is a persisted edit flow.
       */
      it('shows edit confirm message when editing index-pattern', async () => {
        await PageObjects.settings.editIndexPattern(
          'logstash-2*',
          '@timestamp',
          'Index Star',
          true
        );

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText(APP_HEADER_TEST_SUBJECTS.title)).to.contain(
            `Index Star`
          );
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Reopening an edited data view must load its
       * saved title, index expression, and time field from Kibana persistence.
       */
      it('prefills the form with previously saved values', async () => {
        await PageObjects.settings.editIndexPattern('logs*', 'utc_time', 'Logs UTC', true);

        await PageObjects.settings.clickEditIndexButton();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.waitFor('time field', async () => {
          const timeFieldInput = await PageObjects.settings.getTimeFieldNameField();
          return (await timeFieldInput.getAttribute('value')) === 'utc_time';
        });
        expect(await (await PageObjects.settings.getNameField()).getAttribute('value')).to.be(
          'Logs UTC'
        );
        expect(
          await (await PageObjects.settings.getIndexPatternField()).getAttribute('value')
        ).to.be('logs*');

        await flyout.closeFlyout();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.getVisibleText('currentIndexPatternTimeField')).to.be('utc_time');

        await PageObjects.settings.editIndexPattern(
          'logstash-*',
          PageObjects.settings.noTimeFieldOption,
          'Just logs',
          true
        );

        await PageObjects.settings.clickEditIndexButton();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.waitFor('time field', async () => {
          const timeFieldInput = await PageObjects.settings.getTimeFieldNameField();
          return (
            (await timeFieldInput.getAttribute('value')) === PageObjects.settings.noTimeFieldOption
          );
        });
        expect(await (await PageObjects.settings.getNameField()).getAttribute('value')).to.be(
          'Just logs'
        );
        expect(
          await (await PageObjects.settings.getIndexPatternField()).getAttribute('value')
        ).to.be('logstash-*');

        await flyout.closeFlyout();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('currentIndexPatternTimeField');
      });
    });

    describe('index pattern edit', function () {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Changing a saved data view's source and
       * observing its newly resolved field list exercises the editor with Elasticsearch data.
       */
      it('should update field list', async function () {
        await PageObjects.settings.editIndexPattern(
          'kibana_sample_data_flights',
          'timestamp',
          undefined,
          true
        );

        await retry.try(async () => {
          // verify initial field list
          expect(await testSubjects.exists('field-name-AvgTicketPrice')).to.be(true);
        });

        await PageObjects.settings.editIndexPattern('logstash-*', '@timestamp', undefined, true);
        await retry.try(async () => {
          // verify updated field list
          expect(await testSubjects.exists('field-name-@message')).to.be(true);
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. This clicks Save in the editor, waits for the
       * real confirmation modal, and proves the editor prevents a second submission. Rendering a
       * Footer with submitDisabled in Jest would not verify that the editor sets that state.
       */
      it('should disable Save button after pressing', async function () {
        await PageObjects.settings.clickEditIndexButton();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          await PageObjects.settings.setIndexPatternField('logs*');
        });
        await PageObjects.settings.selectTimeFieldOption('@timestamp');

        expect(await testSubjects.isEnabled('saveIndexPatternButton')).to.be(true);
        await (await PageObjects.settings.getSaveDataViewButtonActive()).click();

        // wait for the confirmation modal to open
        await retry.waitFor('confirmation modal', async () => {
          return await testSubjects.exists('confirmModalConfirmButton');
        });

        // while the confirmation modal is open, we can check that the form button has actually become disabled
        expect(await testSubjects.isEnabled('saveIndexPatternButton')).to.be(false);

        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('index pattern deletion', function indexDelete() {
      before(function () {
        const expectedAlertText = 'Delete Data View';
        return PageObjects.settings.removeIndexPattern().then(function (alertText) {
          expect(alertText).to.be(expectedAlertText);
        });
      });

      /**
       * Migration recommendation: MIGRATE TO SCOUT. Returning to the listing after deleting a
       * saved data view verifies routing after a destructive user action.
       */
      it('should return to index pattern list', function indexNotInUrl() {
        // give the url time to settle
        return retry.try(function tryingForTime() {
          return browser.getCurrentUrl().then(function (currentUrl) {
            log.debug('currentUrl = ' + currentUrl);
            expect(currentUrl).to.contain('management/kibana/dataViews');
          });
        });
      });
    });

    describe('hidden index support', () => {
      /**
       * Migration recommendation: MIGRATE TO SCOUT. Creating against a real hidden index and
       * confirming allow-hidden survives a reload exercises Elasticsearch matching and saved
       * data-view persistence together.
       */
      it('can create data view against hidden index', async () => {
        const pattern = 'logstash-2015.09.2*';

        await es.transport.request({
          path: '/logstash-2015.09.2*/_settings',
          method: 'PUT',
          body: {
            index: {
              hidden: true,
            },
          },
        });

        await PageObjects.settings.createIndexPattern(
          pattern,
          '@timestamp',
          undefined,
          undefined,
          undefined,
          true
        );
        const patternName = await PageObjects.settings.getIndexPageHeading();
        expect(patternName).to.be(pattern);

        // verify that allow hidden persists through reload
        await browser.refresh();

        await testSubjects.click('editIndexPatternButton');
        await testSubjects.click('toggleAdvancedSetting');
        const allowHiddenField = await testSubjects.find('allowHiddenField');
        const button = await allowHiddenField.findByTagName('button');
        expect(await button.getAttribute('aria-checked')).to.be('true');
      });
    });
  });
}
