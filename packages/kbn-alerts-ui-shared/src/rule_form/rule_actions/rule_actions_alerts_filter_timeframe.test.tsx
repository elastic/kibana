/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Moment } from 'moment';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { RuleActionsAlertsFilterTimeframe } from './rule_actions_alerts_filter_timeframe';
import { AlertsFilterTimeframe } from '@kbn/alerting-types';
import { getAction } from '../../common/test_utils/actions_test_utils';

describe('ruleActionsAlertsFilterTimeframe', () => {
  async function setup(timeframe?: AlertsFilterTimeframe) {
    const wrapper = mountWithIntl(
      <RuleActionsAlertsFilterTimeframe
        action={getAction('1', { alertsFilter: { timeframe } })}
        settings={
          {
            client: {
              get: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
            },
          } as unknown as SettingsStart
        }
        onChange={() => {}}
      />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  it('renders an unchecked switch when passed a null timeframe', async () => {
    const wrapper = await setup();

    const alertsFilterTimeframeToggle = wrapper.find(
      '[data-test-subj="alertsFilterTimeframeToggle"]'
    );

    expect(alertsFilterTimeframeToggle.first().props().checked).toBeFalsy();
  });

  it('renders the passed in timeframe', async () => {
    const wrapper = await setup({
      days: [6, 7],
      timezone: 'America/Chicago',
      hours: { start: '10:00', end: '20:00' },
    });

    const alertsFilterTimeframeToggle = wrapper.find(
      '[data-test-subj="alertsFilterTimeframeToggle"]'
    );

    expect(alertsFilterTimeframeToggle.first().props().checked).toBeTruthy();

    const alertsFilterTimeframeWeekdayButtons = wrapper.find(
      '[data-test-subj="alertsFilterTimeframeWeekdayButtons"]'
    );
    expect(alertsFilterTimeframeWeekdayButtons.exists()).toBeTruthy();
    // Use Reflect.get to avoid typescript errors
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="1"]').first().props(),
        'isSelected'
      )
    ).toBeFalsy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="2"]').first().props(),
        'isSelected'
      )
    ).toBeFalsy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="3"]').first().props(),
        'isSelected'
      )
    ).toBeFalsy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="4"]').first().props(),
        'isSelected'
      )
    ).toBeFalsy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="5"]').first().props(),
        'isSelected'
      )
    ).toBeFalsy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="6"]').first().props(),
        'isSelected'
      )
    ).toBeTruthy();
    expect(
      Reflect.get(
        alertsFilterTimeframeWeekdayButtons.find('[data-test-subj="6"]').first().props(),
        'isSelected'
      )
    ).toBeTruthy();

    const alertsFilterTimeframeStart = wrapper.find(
      '[data-test-subj="alertsFilterTimeframeStart"]'
    );
    expect(alertsFilterTimeframeStart.exists()).toBeTruthy();
    {
      // @ts-expect-error upgrade typescript v4.9.5
      const selectedDate: Moment = Reflect.get(
        alertsFilterTimeframeStart.first().props(),
        'selected'
      );
      expect(selectedDate.format('HH:mm')).toEqual('10:00');
    }

    const alertsFilterTimeframeEnd = wrapper.find('[data-test-subj="alertsFilterTimeframeEnd"]');
    expect(alertsFilterTimeframeEnd.exists()).toBeTruthy();
    {
      // @ts-expect-error upgrade typescript v4.9.5
      const selectedDate: Moment = Reflect.get(
        alertsFilterTimeframeEnd.first().props(),
        'selected'
      );
      expect(selectedDate.format('HH:mm')).toEqual('20:00');
    }

    const alertsFilterTimeframeTimezone = wrapper.find(
      '[data-test-subj="alertsFilterTimeframeTimezone"]'
    );
    expect(alertsFilterTimeframeTimezone.exists()).toBeTruthy();
    expect(
      Reflect.get(alertsFilterTimeframeTimezone.first().props(), 'selectedOptions')[0].label
    ).toEqual('America/Chicago');
  });
});
