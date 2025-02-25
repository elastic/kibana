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

const dashboardName = 'Dashboard Test Time';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, timePicker } = getPageObjects(['dashboard', 'header', 'timePicker']);
  const pieChart = getService('pieChart');
  const browser = getService('browser');

  describe('dashboard time', () => {
    before(async function () {
      await dashboard.initTests();
      await dashboard.preserveCrossAppState();
    });

    after(async function () {
      await dashboard.navigateToApp();
    });

    describe('dashboard without stored timed', () => {
      it('is saved', async () => {
        await dashboard.clickNewDashboard();
        await dashboard.addVisualizations([dashboard.getTestVisualizationNames()[0]]);
        await dashboard.saveDashboard(dashboardName, {
          storeTimeWithDashboard: false,
          saveAsNew: true,
        });
      });

      it('Does not set the time picker on open', async () => {
        await timePicker.setDefaultAbsoluteRange();

        await dashboard.loadSavedDashboard(dashboardName);

        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal(timePicker.defaultStartTime);
        expect(time.end).to.equal(timePicker.defaultEndTime);
      });
    });

    describe('dashboard with stored timed', function () {
      it('is saved with time', async function () {
        await dashboard.switchToEditMode();
        await timePicker.setDefaultAbsoluteRange();
        await dashboard.saveDashboard(dashboardName, {
          storeTimeWithDashboard: true,
          saveAsNew: false,
        });
      });

      it('sets time on open', async function () {
        await timePicker.setAbsoluteRange(
          'Jan 1, 2019 @ 00:00:00.000',
          'Jan 2, 2019 @ 00:00:00.000'
        );

        await dashboard.loadSavedDashboard(dashboardName);

        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal(timePicker.defaultStartTime);
        expect(time.end).to.equal(timePicker.defaultEndTime);
      });

      // If time is stored with a dashboard, it's supposed to override the current time settings when opened.
      // However, if the URL also contains time in the global state, then the global state
      // time should take precedence.
      it('should be overwritten by global state', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await dashboard.getDashboardIdFromCurrentUrl();

        await dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/view/${id}?_g=(time:(from:now-1h,to:now))`;
        await browser.get(urlWithGlobalTime, false);
        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal('~ an hour ago');
        expect(time.end).to.equal('now');

        /**
         * With the time range set to an hour ago until now there should be no data. This ensures that the URL time
         * range and NOT the saved time range was properly set on the Dashboard and passed down to its children.
         */
        await pieChart.expectEmptyPieChart();
      });

      it('should use saved time, if time is missing in global state, but _g is present in the url', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await dashboard.getDashboardIdFromCurrentUrl();

        await dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/view/${id}?_g=(filters:!())`;
        await browser.get(urlWithGlobalTime, false);
        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal(timePicker.defaultStartTime);
        expect(time.end).to.equal(timePicker.defaultEndTime);
      });

      it('should use saved time after time change is undone', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
        const id = await dashboard.getDashboardIdFromCurrentUrl();

        await dashboard.gotoDashboardLandingPage();

        const urlWithGlobalTime = `${kibanaBaseUrl}#/view/${id}?_g=(filters:!())`;
        await browser.get(urlWithGlobalTime, false);

        // set the time to something else
        await timePicker.setAbsoluteRange(
          'Jan 1, 2019 @ 00:00:00.000',
          'Jan 2, 2019 @ 00:00:00.000'
        );
        await dashboard.waitForRenderComplete();
        await browser.goBack();

        // time should have restored to the saved time range.
        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal(timePicker.defaultStartTime);
        expect(time.end).to.equal(timePicker.defaultEndTime);
      });
    });

    // If the user has time stored with a dashboard, it's supposed to override the current time settings
    // when it's opened. However, if the user then changes the time, navigates to visualize, then navigates
    // back to dashboard, the overridden time should be preserved. The time is *only* reset on open, not
    // during navigation or page refreshes.
    describe('time changes', function () {
      it('preserved during navigation', async function () {
        await dashboard.loadSavedDashboard(dashboardName);

        await timePicker.setAbsoluteRange(
          'Jan 1, 2019 @ 00:00:00.000',
          'Jan 2, 2019 @ 00:00:00.000'
        );
        await header.clickVisualize();
        await header.clickDashboard();

        const time = await timePicker.getTimeConfig();
        expect(time.start).to.equal('Jan 1, 2019 @ 00:00:00.000');
        expect(time.end).to.equal('Jan 2, 2019 @ 00:00:00.000');
      });
    });
  });
}
