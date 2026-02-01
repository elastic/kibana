/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
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

  describe('discover unsaved changes modal', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
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

    describe('when the user leaves the discover app', () => {
      describe('when the session is saved', () => {
        describe('when there are unsaved changes', () => {
          it('should show the unsaved changes modal', async () => {
            await discover.saveSearch('saved search with unsaved changes');
            await discover.waitUntilSearchingHasFinished();

            await unifiedFieldList.clickFieldListItemAdd('bytes');
            await header.waitUntilLoadingHasFinished();
            await discover.waitUntilSearchingHasFinished();

            await appsMenu.clickLink('Dashboard', { category: 'kibana' });

            await testSubjects.existOrFail('appLeaveConfirmModal');
          });
        });

        describe('when there are no unsaved changes', () => {
          it('should not show the unsaved changes modal', async () => {
            await discover.saveSearch('saved search without unsaved changes');
            await discover.waitUntilSearchingHasFinished();

            await appsMenu.clickLink('Dashboard', { category: 'kibana' });

            await testSubjects.missingOrFail('appLeaveConfirmModal');
          });
        });
      });

      describe('when the session is not saved', () => {
        describe('when there are unsaved changes', () => {
          it('should not show the unsaved changes modal', async () => {
            await unifiedFieldList.clickFieldListItemAdd('bytes');
            await header.waitUntilLoadingHasFinished();
            await discover.waitUntilSearchingHasFinished();

            await appsMenu.clickLink('Dashboard', { category: 'kibana' });

            await testSubjects.missingOrFail('appLeaveConfirmModal');
          });
        });

        describe('when there are no unsaved changes', () => {
          it('should not show the unsaved changes modal', async () => {
            await appsMenu.clickLink('Dashboard', { category: 'kibana' });

            await testSubjects.missingOrFail('appLeaveConfirmModal');
          });
        });
      });
    });
  });
}
