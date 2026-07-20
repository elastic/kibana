/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/discover/group6/_unsaved_changes_notification_indicator.ts

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const SAVED_SEARCH_NAME = 'test saved search';
const SAVED_SEARCH_WITH_FILTERS_NAME = 'test saved search with filters';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const filterBar = getService('filterBar');
  const monacoEditor = getService('monacoEditor');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover unsaved changes notification indicator', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test
     */
    it('should not show the notification indicator initially nor after changes to a draft saved search', async () => {
      await discover.ensureNoUnsavedChangesIndicator();

      await unifiedFieldList.clickFieldListItemAdd('bytes');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test
     */
    it('should show the notification indicator only after changes to a persisted saved search', async () => {
      await discover.saveSearch(SAVED_SEARCH_NAME);
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();

      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.saveUnsavedChanges();

      await discover.ensureNoUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test
     */
    it('should not show a notification indicator after loading a saved search, only after changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();

      await discover.chooseBreakdownField('_index');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureHasUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test
     */
    it('should not show a notification indicator after loading an ES|QL saved search, only after changes', async () => {
      await discover.loadSavedSearch('ES|QL Discover Session');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureHasUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test
     */
    it('should allow to revert changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await discover.waitUntilTabIsLoaded();
      await discover.ensureNoUnsavedChangesIndicator();

      // test changes to columns
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      await discover.ensureHasUnsavedChangesIndicator();
      await discover.revertUnsavedChanges();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await discover.ensureNoUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: pare down and merge with the above block - covered by state comparator unit tests, so let's just do this minimally.
     */
    it('should hide the notification indicator once user manually reverts changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await discover.ensureNoUnsavedChangesIndicator();

      // changes to columns
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      await discover.ensureHasUnsavedChangesIndicator();
      await unifiedFieldList.clickFieldListItemRemove('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await discover.ensureNoUnsavedChangesIndicator();

      // test changes to breakdown field
      await discover.chooseBreakdownField('_index');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.ensureHasUnsavedChangesIndicator();
      await discover.clearBreakdownField();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.ensureNoUnsavedChangesIndicator();
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT - cheap smoke test for obscure feature
     */
    it('should not show the notification indicator after pinning the first filter but after disabling a filter', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await filterBar.addFilter({ field: 'bytes', operation: 'exists' });
      await discover.saveSearch(SAVED_SEARCH_WITH_FILTERS_NAME);
      await discover.waitUntilSearchingHasFinished();

      await discover.ensureNoUnsavedChangesIndicator();

      await filterBar.toggleFilterPinned('extension');
      await discover.waitUntilSearchingHasFinished();
      expect(await filterBar.isFilterPinned('extension')).to.be(true);

      await discover.ensureNoUnsavedChangesIndicator();

      await filterBar.toggleFilterNegated('bytes');
      await discover.waitUntilSearchingHasFinished();
      expect(await filterBar.isFilterNegated('bytes')).to.be(true);

      await discover.ensureHasUnsavedChangesIndicator();

      await discover.revertUnsavedChanges();
      await discover.ensureNoUnsavedChangesIndicator();

      expect(await filterBar.getFilterCount()).to.be(2);
      expect(await filterBar.isFilterPinned('extension')).to.be(false);
      expect(await filterBar.isFilterNegated('bytes')).to.be(false);
      expect(await discover.getHitCount()).to.be('1,373');
    });
  });
}
