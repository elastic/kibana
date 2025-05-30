/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, dashboard, header, home } = getPageObjects(['common', 'dashboard', 'header', 'home']);
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const deployment = getService('deployment');

  describe.only('bwc short urls', () => {
    let baseUrl: string;
    before(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.addSampleDataSet('logs');

      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/bwc_short_urls'
      );

      baseUrl = deployment.getHostPort();
    });

    after(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.removeSampleDataSet('logs');

      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/bwc_short_urls'
      );
    });

    // 8.14 pre-embeddable rebuild, URL state is runtime state with injected references 
    it('should load dashboard from short url (8.14)', async () => {
      await browser.navigateTo(baseUrl + '/app/r/s/Jh1lq');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const panels = await dashboard.getDashboardPanels();
      expect(panels.length).to.be(2);
    });
  });
}