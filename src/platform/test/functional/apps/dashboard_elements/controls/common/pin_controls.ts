/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const security = getService('security');
  const dashboardAddPanel = getService('dashboardAddPanel');

  const { dashboardControls, timePicker, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
  ]);

  const DASHBOARD_NAME = 'Test Pin Controls';

  describe('Pinning and unpinning controls', () => {
    let controlId: string;

    before(async () => {
      await dashboard.navigateToApp();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        exitFromEditMode: false,
        saveAsNew: true,
      });
    });

    after(async () => {
      await dashboardControls.clearAllControls();
      await security.testUser.restoreDefaults();
    });

    describe('Control created from the controls menu', () => {
      before(async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        const controlIds = await dashboardControls.getAllControlIds();
        controlId = controlIds[controlIds.length - 1];
      });

      it('initializes pinned', async () => {
        expect(await dashboardControls.isControlPinned(controlId)).to.be(true);
      });

      it('can be unpinned', async () => {
        await dashboardControls.unpinExistingControl(controlId);
        await retry.try(async () => {
          expect(await dashboardControls.isControlPinned(controlId)).to.be(false);
        });
      });
    });

    describe('Control created from the panel menu', () => {
      before(async () => {
        await dashboardAddPanel.clickAddControlPanel();
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
          skipOpenFlyout: true,
        });
        const controlIds = await dashboardControls.getAllControlIds();
        controlId = controlIds[controlIds.length - 1];
      });

      it('initializes unpinned', async () => {
        expect(await dashboardControls.isControlPinned(controlId)).to.be(false);
      });

      it('can be pinned', async () => {
        await dashboardControls.pinExistingControl(controlId);
        await retry.try(async () => {
          expect(await dashboardControls.isControlPinned(controlId)).to.be(true);
        });
      });
    });
  });
}
