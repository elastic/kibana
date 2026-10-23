/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

const TIME_ZONE = 'Japan';
const FIRST_DAY_OF_WEEK = 'Wednesday';

/**
 * Fixed initial range used to make the calendar open on September 2015,
 * independently of the current date or the machine running the test.
 */
const INITIAL_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

const MONTH_LABEL = 'September 2015';
const SELECTED_DAY = 20;

/**
 * September 20 in Japan represented as UTC instants:
 *
 * Sep 20 00:00:00.000 Japan = Sep 19 15:00:00.000 UTC
 * Sep 20 23:59:59.999 Japan = Sep 20 14:59:59.999 UTC
 */
const EXPECTED_DATE_RANGE = '2015-09-19T15:00:00.000Z to 2015-09-20T14:59:59.999Z';
const EXPECTED_DISPLAY_RANGE = 'Sep 20, 2015, 00:00 → Sep 20, 2015, 23:59';

spaceTest.describe('Date range picker UI settings', { tag: testData.SQM_UI_TAG }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.SAVED_QUERY_BUNDLE);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('dateFormat:tz', 'dateFormat:dow', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'honors the configured week start and time zone when selecting a calendar day',
    async ({ scoutSpace, browserAuth, pageObjects }) => {
      await spaceTest.step('configure the time range and calendar settings', async () => {
        await scoutSpace.uiSettings.setDefaultTime(INITIAL_TIME_RANGE);

        /*
         * Scout browsers use GMT. Configuring Japan ensures that browser-local
         * and configured-time-zone day boundaries are observably different.
         */
        await scoutSpace.uiSettings.set({
          'dateFormat:tz': TIME_ZONE,
          'dateFormat:dow': FIRST_DAY_OF_WEEK,
        });
      });

      await spaceTest.step('open Discover with a time-based data view', async () => {
        await browserAuth.loginWithCustomRole(testData.DISCOVER_ALL_SQM_ALL_ROLE);
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.selectDataView('logstash-*');
        await pageObjects.discover.waitUntilSearchingHasFinished();
      });

      const { datePicker } = pageObjects;

      await spaceTest.step('open the calendar', async () => {
        await datePicker.openCalendarPanel();
      });

      await spaceTest.step('start the calendar week on Wednesday', async () => {
        await expect(datePicker.getCalendarWeekdayHeaders(MONTH_LABEL)).toHaveText([
          'We',
          'Th',
          'Fr',
          'Sa',
          'Su',
          'Mo',
          'Tu',
        ]);
      });

      await spaceTest.step('apply September 20 as one complete day in Japan', async () => {
        const calendarDay = datePicker.getCalendarDay(MONTH_LABEL, SELECTED_DAY);

        await expect(calendarDay).toBeVisible();

        await datePicker.selectCalendarDay(MONTH_LABEL, SELECTED_DAY);
        await datePicker.applyCalendarSelection();

        /*
         * Verify the customer-facing value is a complete September 20 in
         * the configured Japan time zone.
         */
        await expect(datePicker.getTimePickerControl()).toContainText(EXPECTED_DISPLAY_RANGE);

        /*
         * Verify the actual query bounds are the corresponding UTC instants,
         * including the final millisecond of the selected day.
         */
        await expect(datePicker.getTimePickerControl()).toHaveAttribute(
          'data-date-range',
          EXPECTED_DATE_RANGE
        );
      });
    }
  );
});
