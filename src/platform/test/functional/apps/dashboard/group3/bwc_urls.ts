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
  const { common, dashboard, dashboardControls, header, home } = getPageObjects([
    'common',
    'dashboard',
    'dashboardControls',
    'header',
    'home',
  ]);
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const find = getService('find');

  async function assertDashboardRendered() {
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();

    const controlIds = await dashboardControls.getAllControlIds();
    expect(controlIds.length).to.be(1);
    const selectionString = await dashboardControls.optionsListGetSelectionsString(controlIds[0]);
    expect(selectionString).to.be('win 7');

    const panels = await dashboard.getDashboardPanels();
    expect(panels.length).to.be(1);

    const titles = await dashboard.getPanelTitles();
    expect(titles.length).to.be(1);
    expect(titles[0]).to.equal('Custom map');

    // can not use maps page object because its in x-pack
    // TODO - move map page object to src/test page objects
    expect((await find.allByCssSelector('.mapTocEntry')).length).to.be(4);
  }

  describe('bwc urls', () => {
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

    describe('legacy urls', () => {
      it('should forward legacy dashboard urls', async () => {
        await browser.navigateTo(
          baseUrl + '/app/kibana#/dashboard/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b'
        );
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        const panels = await dashboard.getDashboardPanels();
        expect(panels.length).to.be(12);
      });
    });

    describe('short urls', () => {
      // 8.14 before the Embeddable refactor
      it('should load dashboard with 8.14 state', async () => {
        await browser.navigateTo(baseUrl + '/goto/url_to_8_14_dashboard');
        await assertDashboardRendered();
      });

      // 8.18 after the embeddable refactor and before Serialized state only
      it('should load dashboard with 8.18 state', async () => {
        await browser.navigateTo(baseUrl + '/goto/url_to_8_18_dashboard');
        await assertDashboardRendered();
      });

      // 8.18 after the embeddable refactor and after Serialized state only
      it('should load dashboard with 8.19 state', async () => {
        await browser.navigateTo(baseUrl + '/goto/url_to_8_19_dashboard');
        await assertDashboardRendered();
      });
    });
  });
}
