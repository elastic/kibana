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
  const esArchiver = getService('esArchiver');
  const { discover, timePicker, header, common } = getPageObjects([
    'discover',
    'timePicker',
    'header',
    'common',
  ]);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const appsMenu = getService('appsMenu');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  describe('discover URL in side nav', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('saves the last URL when in data view mode', async function () {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('response:200');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDiscover();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        expect(await queryBar.getQueryString()).to.be('response:200');
        expect(await discover.getHitCount()).to.be('12,891');
      });
    });

    it('saves the last URL when in ES|QL mode', async function () {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('FROM logstash-* | LIMIT 30');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDiscover();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logstash-* | LIMIT 30');
        expect(await discover.getHitCount()).to.be('30');
      });
    });

    it('should not save the last URL if it was an ad-hoc data view', async function () {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('response:200');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await dataViews.createFromSearchBar({ name: 'logs', hasTimeField: true, adHoc: true });
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('response:503');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDiscover();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        expect(await queryBar.getQueryString()).to.be('response:200');
        expect(await discover.getHitCount()).to.be('12,891');
      });
    });

    it('saves the last URL if the session was saved', async function () {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await dataViews.createFromSearchBar({ name: 'logs', hasTimeField: true, adHoc: true });
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('response:404');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.saveSearch('test');

      await appsMenu.openCollapsibleNav();
      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      await appsMenu.openCollapsibleNav();
      await header.clickDiscover();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        expect(await queryBar.getQueryString()).to.be('response:404');
        expect(await discover.getHitCount()).to.be('696');
        expect(await discover.getSavedSearchTitle()).to.be('test');
      });
    });
  });
}
