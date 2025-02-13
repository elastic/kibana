/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const { dashboardControls, dashboard, timePicker } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'timePicker',
  ]);

  describe('Dashboard control group settings', () => {
    before(async () => {
      await dashboard.loadSavedDashboard('control group settings test dashboard');
      await dashboard.switchToEditMode();
    });

    describe('filtering settings', () => {
      const firstOptionsListId = 'bcb81550-0843-44ea-9020-6c1ebf3228ac';
      let beforeCount: number;

      const rangeSliderId = '15925456-9e12-4b08-b2e6-4ae6ac27114d';
      let beforeRange: number;

      const getRange = async () => {
        await dashboardControls.rangeSliderWaitForLoading(rangeSliderId);
        const lower =
          (await dashboardControls.rangeSliderGetLowerBoundAttribute(
            rangeSliderId,
            'placeholder'
          )) ?? '0';
        const upper =
          (await dashboardControls.rangeSliderGetUpperBoundAttribute(
            rangeSliderId,
            'placeholder'
          )) ?? '0';
        return parseInt(upper, 10) - parseInt(lower, 10);
      };

      before(async () => {
        await dashboardControls.optionsListWaitForLoading(firstOptionsListId);
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        beforeCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();

        beforeRange = await getRange();
      });

      describe('do not apply global filters', () => {
        it('- filter pills', async () => {
          await filterBar.addFilter({ field: 'animal.keyword', operation: 'is', value: 'cat' });
          await dashboardControls.optionsListOpenPopover(firstOptionsListId);
          let afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
          expect(afterCount).to.be.lessThan(beforeCount);
          await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);

          await dashboardControls.updateFilterSyncSetting(false);
          await dashboardControls.optionsListOpenPopover(firstOptionsListId);
          afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
          expect(afterCount).to.be.equal(beforeCount);

          await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);
          await filterBar.removeAllFilters();
        });

        it('- query', async () => {
          await queryBar.setQuery('weightLbs < 40');
          await queryBar.submitQuery();
          let afterRange = await getRange();
          expect(afterRange).to.be.equal(beforeRange);
          await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);

          await dashboardControls.updateFilterSyncSetting(true);
          afterRange = await getRange();
          expect(afterRange).to.be.lessThan(beforeRange);
          await dashboardControls.rangeSliderEnsurePopoverIsClosed(rangeSliderId);
          await queryBar.clearQuery();
          await queryBar.submitQuery();
        });
      });

      it('do not apply time range', async () => {
        await timePicker.setCommonlyUsedTime('Today');
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        let afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
        expect(afterCount).to.be.equal(0);
        await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);

        await dashboardControls.updateTimeRangeSyncSetting(false);
        await dashboardControls.optionsListOpenPopover(firstOptionsListId);
        afterCount = await dashboardControls.optionsListPopoverGetAvailableOptionsCount();
        expect(afterCount).to.be.equal(beforeCount);
        await dashboardControls.optionsListEnsurePopoverIsClosed(firstOptionsListId);
        await timePicker.setDefaultDataRange();
        await dashboardControls.updateTimeRangeSyncSetting(true);
      });
    });

    describe('control group settings flyout closes', () => {
      it('when navigating away from dashboard', async () => {
        await dashboard.switchToEditMode();
        await dashboardControls.openControlGroupSettingsFlyout();
        await dashboard.gotoDashboardLandingPage();
        await testSubjects.missingOrFail('control-group-settings-flyout');
      });
    });
  });
}
