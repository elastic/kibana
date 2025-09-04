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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const monacoEditor = getService('monacoEditor');
  const retry = getService('retry');
  const find = getService('find');

  const { common, unifiedFieldList, discover } = getPageObjects([
    'common',
    'unifiedFieldList',
    'discover',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    enableESQL: true,
  };

  describe('Discover background search', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );

      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await dataViews.switchToAndValidate('kibana_sample_data_flights');
      await discover.selectTextBaseLang();
    });

    describe('ESQL view', function () {
      it('stores a finished search', async () => {
        const ariaLabel = await testSubjects.getAttribute(
          'querySubmitSplitButton-primary-button',
          'aria-label'
        );
        expect(ariaLabel).to.eql('Refresh query');
        await testSubjects.click('querySubmitSplitButton-secondary-button');
        await retry.waitFor(
          'the toast appears indicating that the search session is saved',
          async () => {
            const element = await find.byButtonText('Check its progress here');
            return !!element;
          }
        );
      });

      it('runs and stores a new search', async () => {
        await monacoEditor.setCodeEditorValue('FROM kibana_sample_data_flights | LIMIT 10');

        const ariaLabel = await testSubjects.getAttribute(
          'querySubmitSplitButton-primary-button',
          'aria-label'
        );
        expect(ariaLabel).to.eql('Run query');

        await testSubjects.click('querySubmitSplitButton-secondary-button');
        await retry.waitFor(
          'the toast appears indicating that the search session is saved',
          async () => {
            const element = await find.byButtonText('Check its progress here');
            return !!element;
          }
        );
        await discover.waitUntilSearchingHasFinished();
      });

      it('stores a running search', async () => {
        await monacoEditor.setCodeEditorValue(
          'FROM kibana_sample_data_flights | LIMIT 10 | WHERE DELAY(1000ms)'
        );

        await testSubjects.click('querySubmitSplitButton-primary-button');

        await retry.waitFor('waits for the Cancel button to appear', async () => {
          const ariaLabel = await testSubjects.getAttribute(
            'queryCancelSplitButton-primary-button',
            'aria-label'
          );
          return ariaLabel === 'Cancel';
        });

        await testSubjects.click('queryCancelSplitButton-secondary-button');

        await retry.waitFor(
          'the toast appears indicating that the search session is saved',
          async () => {
            const element = await find.byButtonText('Check its progress here');
            return !!element;
          }
        );
      });
    });
  });
}
