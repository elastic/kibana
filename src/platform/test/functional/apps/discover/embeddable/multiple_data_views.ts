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
  const dashboardExpect = getService('dashboardExpect');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const { dashboard } = getPageObjects(['dashboard']);

  describe('discover session multiple data views', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('courier:ignoreFilterIfFieldNotInIndex disabled', () => {
      before(async () => {
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('discover session multiple data views');
        await dashboard.waitForRenderComplete();
      });

      it('Should display no results from logstash-* when filtered by animals data view', async function () {
        await dashboard.waitForRenderComplete();
        await dashboardExpect.savedSearchNoResult();
      });
    });

    describe('courier:ignoreFilterIfFieldNotInIndex enabled', () => {
      before(async () => {
        await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': true });

        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('discover session multiple data views');
        await dashboard.waitForRenderComplete();
      });

      after(async () => {
        await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      });

      it('Should display results from logstash-* when filtered by animals data view', async function () {
        const logstashSavedSearchPanel = await testSubjects.find('embeddedSavedSearchDocTable');
        expect(
          await (
            await logstashSavedSearchPanel.findByCssSelector('[data-document-number]')
          ).getAttribute('data-document-number')
        ).to.be('500');
      });
    });
  });
}
