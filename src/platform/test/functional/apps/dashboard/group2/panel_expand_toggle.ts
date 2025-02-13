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
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const { dashboard } = getPageObjects(['dashboard']);

  describe('expanding a panel', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.loadSavedDashboard('few panels');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('hides other panels', async () => {
      await dashboardPanelActions.clickExpandPanelToggle();
      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });

    it('shows other panels after being minimized', async () => {
      const panelCount = await dashboard.getPanelCount();
      // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
      await dashboardPanelActions.clickExpandPanelToggle();
      await dashboardPanelActions.clickExpandPanelToggle();

      // Add a retry to fix https://github.com/elastic/kibana/issues/14574.  Perhaps the recent changes to this
      // being a CSS update is causing the UI to change slower than grabbing the panels?
      await retry.try(async () => {
        const panelCountAfterMaxThenMinimize = await dashboard.getPanelCount();
        expect(panelCountAfterMaxThenMinimize).to.be(panelCount);
      });
    });
  });
}
