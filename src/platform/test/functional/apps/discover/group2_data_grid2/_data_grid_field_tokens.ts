/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const { common, discover, timePicker, dashboard, unifiedFieldList, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
    'header',
  ]);
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  async function findFirstColumnTokens() {
    await header.waitUntilLoadingHasFinished();
    await discover.waitUntilSearchingHasFinished();
    return await findFirstFieldIcons('euiDataGridBody > dataGridHeader');
  }

  async function findFirstDocViewerTokens() {
    await header.waitUntilLoadingHasFinished();
    await discover.waitUntilSearchingHasFinished();
    let fieldTokens: string[] | undefined = [];
    await retry.try(async () => {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      fieldTokens = await findFirstFieldIcons('docViewerFlyout');
    });
    return fieldTokens;
  }

  async function findFirstFieldIcons(elementSelector: string) {
    let firstFieldIcons: string[] | undefined;

    await retry.waitFor('field tokens', async () => {
      const element = await testSubjects.find(elementSelector);
      const fieldIcons = await element.findAllByCssSelector('.kbnFieldIcon svg');

      firstFieldIcons = await Promise.all(
        fieldIcons.slice(0, 10).map(async (fieldIcon) => {
          return (await fieldIcon.getAttribute('aria-label')) ?? '';
        })
      ).catch((error) => {
        log.debug(`error in findFirstFieldIcons: ${error.message}`);
        return undefined;
      });

      return typeof firstFieldIcons !== 'undefined';
    });

    return firstFieldIcons;
  }

  describe('discover data grid field tokens', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
    });

    it('should not render field tokens when Document column is visible', async function () {
      expect(await discover.getHitCount()).to.be('14,004');

      expect(await findFirstColumnTokens()).to.eql([]);

      expect(await findFirstDocViewerTokens()).to.eql([
        'Keyword',
        'Keyword',
        'Keyword',
        'Number',
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
      ]);
    });

    it('should render field tokens correctly when columns are selected', async function () {
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('ip');
      await unifiedFieldList.clickFieldListItemAdd('geo.coordinates');

      expect(await findFirstColumnTokens()).to.eql(['Number', 'Text', 'IP address', 'Geo point']);

      expect(await findFirstDocViewerTokens()).to.eql([
        'Keyword',
        'Keyword',
        'Keyword',
        'Number',
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
      ]);
    });

    it('should render field tokens correctly for ES|QL', async function () {
      await discover.selectTextBaseLang();
      expect(await discover.getHitCount()).to.be('10');
      await unifiedFieldList.clickFieldListItemAdd('@timestamp');
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('ip');
      await unifiedFieldList.clickFieldListItemAdd('geo.coordinates');

      expect(await findFirstColumnTokens()).to.eql(['Number', 'Text', 'IP address', 'Geo point']);

      expect(await findFirstDocViewerTokens()).to.eql([
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
        'Text',
        'Geo point',
        'Keyword',
        'Keyword',
      ]);
    });

    it('should render field tokens correctly on Dashboard', async function () {
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('geo.coordinates');
      await unifiedFieldList.clickFieldListItemAdd('relatedContent.article:modified_time');
      await discover.saveSearch('With columns');

      await common.navigateToApp('dashboard');
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch('With columns');

      expect(await findFirstColumnTokens()).to.eql(['Number', 'Text', 'Geo point', 'Date']);

      expect(await findFirstDocViewerTokens()).to.eql([
        'Keyword',
        'Keyword',
        'Keyword',
        'Number',
        'Text',
        'Text',
        'Date',
        'Text',
        'Number',
        'IP address',
      ]);
    });

    it('should render field tokens correctly on Surrounding Documents page', async function () {
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');

      // navigate to the context view
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const [, surroundingActionEl] = await dataGrid.getRowActions({
        isAnchorRow: false,
        rowIndex: 0,
      });
      await surroundingActionEl.click();
      await header.waitUntilLoadingHasFinished();

      expect(await findFirstColumnTokens()).to.eql(['Number', 'Text']);
    });
  });
}
