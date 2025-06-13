/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, exports } = getPageObjects(['dashboard', 'exports']);
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  const setExportDashboardJsonFeatureFlag = async (enabled: boolean) => {
    await kibanaServer.request({
      path: '/internal/core/_settings',
      method: 'PUT',
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: '1',
        [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'ftr',
      },
      body: {
        feature_flags: {
          overrides: {
            'dashboardPlugin.dashboardJsonExport': enabled,
          },
        },
      },
    });
  };

  describe('dashboard export json', function () {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      return dashboard.initTests({
        kibanaIndex:
          'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana.json',
      });
    });

    after(async function () {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      // reset the feature flag to its default state
      await setExportDashboardJsonFeatureFlag(false);
    });

    it('should not show the export JSON option when the feature flag is disabled (by default)', async function () {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard('dashboard with everything');
      await dashboard.waitForRenderComplete();
      // since reporting is also not enabled, the export button should not appear at all
      expect(await exports.exportButtonExists()).to.be(false);
    });

    it('should export existing dashboard as JSON', async function () {
      // Ensure the feature flag is enabled
      await setExportDashboardJsonFeatureFlag(true);

      // Refresh the browser to apply the feature flag change
      await browser.refresh();
      await dashboard.waitForRenderComplete();

      // JSON is the only export integration, so clicking the button should open the flyout
      await exports.clickExportTopNavButton();
      await exports.isExportFlyoutOpen();

      await exports.copyExportAssetText();
      const dashboardAsJson = JSON.parse(await browser.getClipboardValue());
      const panels = await dashboard.getPanelTitles();
      expect(panels.length).to.equal(dashboardAsJson.attributes.panels.length);

      await exports.closeExportFlyout();
    });

    it('should include unsaved changes in the exported JSON', async function () {
      await dashboard.switchToEditMode();
      await dashboard.addVisualizations(['non timebased line chart - dog data']);
      await dashboard.expectUnsavedChangesBadge();

      await exports.clickExportTopNavButton();
      await exports.isExportFlyoutOpen();

      await exports.copyExportAssetText();
      const dashboardAsJson = JSON.parse(await browser.getClipboardValue());
      const panels = await dashboard.getPanelTitles();
      expect(panels.length).to.equal(dashboardAsJson.attributes.panels.length);

      await exports.closeExportFlyout();
    });
  });
}
