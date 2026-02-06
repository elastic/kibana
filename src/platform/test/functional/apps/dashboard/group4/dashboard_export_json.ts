/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { DashboardReadResponseBody } from '@kbn/dashboard-plugin/server';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, exports } = getPageObjects(['dashboard', 'exports']);
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('dashboard export json', function () {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await dashboard.initTests({
        kibanaIndex:
          'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana.json',
      });
    });

    after(async function () {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('exports existing dashboard as JSON', async function () {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard('dashboard with everything');
      await dashboard.waitForRenderComplete();

      await exports.clickExportTopNavButton();
      await exports.isExportFlyoutOpen();

      await exports.copyExportAssetText();
      const dashboardAsJson = JSON.parse(
        await browser.getClipboardValue()
      ) as DashboardReadResponseBody;
      const panels = await dashboard.getPanelTitles();
      expect(panels.length).to.equal(dashboardAsJson.data.panels?.length ?? 0);

      await exports.closeExportFlyout();
    });

    it('includes unsaved changes in the exported JSON', async function () {
      await dashboard.switchToEditMode();
      await dashboard.addVisualizations(['non timebased line chart - dog data']);
      await dashboard.expectUnsavedChangesBadge();

      await exports.clickExportTopNavButton();
      await exports.isExportFlyoutOpen();

      await exports.copyExportAssetText();
      const dashboardAsJson = JSON.parse(
        await browser.getClipboardValue()
      ) as DashboardReadResponseBody;
      const panels = await dashboard.getPanelTitles();
      expect(panels.length).to.equal(dashboardAsJson.data.panels?.length ?? 0);

      await exports.closeExportFlyout();
    });
  });
}
