/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { EuiSuperSelectProps } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { RuleActionsNotifyWhen } from './rule_actions_notify_when';
import { RuleAction, RuleNotifyWhen } from '@kbn/alerting-types';
import { DEFAULT_FREQUENCY } from '../constants';

describe('ruleActionsNotifyWhen', () => {
  async function setup(
    frequency: RuleAction['frequency'] = DEFAULT_FREQUENCY,
    hasAlertsMappings: boolean = true
  ) {
    const wrapper = mountWithIntl(
      <RuleActionsNotifyWhen
        frequency={frequency}
        throttle={frequency.throttle ? Number(frequency.throttle[0]) : null}
        throttleUnit={frequency.throttle ? frequency.throttle[1] : 'm'}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings={hasAlertsMappings}
      />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  it('renders the passed-in frequency on load', async () => {
    const wrapperDefault = await setup();
    {
      const summaryOrPerRuleSelect = wrapperDefault.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('For each alert');

      const notifyWhenSelect = wrapperDefault.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.CHANGE
      );
    }
    const wrapperForEach = await setup(DEFAULT_FREQUENCY);
    {
      const summaryOrPerRuleSelect = wrapperForEach.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('For each alert');

      const notifyWhenSelect = wrapperForEach.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.CHANGE
      );
    }
    const wrapperSummaryThrottle = await setup({
      ...DEFAULT_FREQUENCY,
      throttle: '5h',
      notifyWhen: RuleNotifyWhen.THROTTLE,
    });
    {
      const summaryOrPerRuleSelect = wrapperSummaryThrottle.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('For each alert');

      const notifyWhenSelect = wrapperSummaryThrottle.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.THROTTLE
      );
    }
    expect(
      wrapperSummaryThrottle.find('[data-test-subj="throttleInput"]').first().props().value
    ).toEqual(5);
    expect(
      wrapperSummaryThrottle.find('[data-test-subj="throttleUnitInput"]').first().props().value
    ).toEqual('h');
  });

  it('renders the passed-in rule level notify_when and throttle on load', async () => {
    const wrapperDefault = mountWithIntl(
      <RuleActionsNotifyWhen
        frequency={undefined}
        throttle={9}
        throttleUnit={'m'}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings={true}
        ruleNotifyWhen={RuleNotifyWhen.THROTTLE}
      />
    );

    const summaryOrPerRuleSelect = wrapperDefault.find('[data-test-subj="summaryOrPerRuleSelect"]');
    expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
    expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('For each alert');

    const notifyWhenSelect = wrapperDefault.find('[data-test-subj="notifyWhenSelect"]');
    expect(notifyWhenSelect.exists()).toBeTruthy();
    expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
      RuleNotifyWhen.THROTTLE
    );
    expect(wrapperDefault.find('[data-test-subj="throttleInput"]').first().props().value).toEqual(
      9
    );
    expect(
      wrapperDefault.find('[data-test-subj="throttleUnitInput"]').first().props().value
    ).toEqual('m');
  });

  it('hides the summary selector when hasAlertsMappings is false', async () => {
    const wrapper = await setup(DEFAULT_FREQUENCY, false);
    const summaryOrPerRuleSelect = wrapper.find('[data-test-subj="summaryOrPerRuleSelect"]');
    expect(summaryOrPerRuleSelect.exists()).toBeFalsy();
  });
});
