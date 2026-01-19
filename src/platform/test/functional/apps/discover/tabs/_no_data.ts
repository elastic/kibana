/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs, common, header, spaceSettings } = getPageObjects([
    'discover',
    'unifiedTabs',
    'common',
    'header',
    'spaceSettings',
  ]);
  const kibanaServer = getService('kibanaServer');
  const dataViews = getService('dataViews');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');

  describe('has ES data but no custom data view', function () {
    beforeEach(async () => {
      await common.navigateToApp('home');
      await kibanaServer.savedObjects.cleanStandardList();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    it('shows tabs bar by default in classic solution type', async () => {
      await testSubjects.missingOrFail('noDataViewsPrompt');
      await dataViews.waitForSwitcherToBe('All logs');
      expect(await unifiedTabs.isTabsBarVisible()).to.be(true);
    });

    describe('non-classic solution type', function () {
      before(async () => {
        await spaceSettings.switchSpaceSolutionType({
          spaceName: 'default',
          solution: 'search',
        });
      });

      beforeEach(async () => {
        await testSubjects.existOrFail('noDataViewsPrompt');
      });

      after(async () => {
        await spaceSettings.switchSpaceSolutionType({
          spaceName: 'default',
          solution: 'classic',
        });
      });

      it('can create a new data view', async () => {
        expect(await unifiedTabs.isTabsBarVisible()).to.be(false);
        const dataViewToCreate = 'logstash';
        await dataViews.createFromPrompt({ name: dataViewToCreate });
        await dataViews.waitForSwitcherToBe(`${dataViewToCreate}*`);
        expect((await dataGrid.getDocTableRows()).length).to.be.above(0);
        expect(await unifiedTabs.isTabsBarVisible()).to.be(true);
      });

      it('can enter ES|QL mode', async () => {
        expect(await unifiedTabs.isTabsBarVisible()).to.be(false);
        await testSubjects.click('tryESQLLink');
        await discover.waitUntilTabIsLoaded();
        expect(await monacoEditor.getCodeEditorValue()).to.be('FROM logs*');
        expect((await dataGrid.getDocTableRows()).length).to.be.above(0);
        expect(await unifiedTabs.isTabsBarVisible()).to.be(true);
      });
    });
  });
}
