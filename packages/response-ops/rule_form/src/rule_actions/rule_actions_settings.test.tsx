/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RuleActionsSettings } from './rule_actions_settings';
import { getAction } from '../common/test_utils/actions_test_utils';
import { RuleTypeModel } from '../common';
import { RuleType } from '@kbn/alerting-types';
import userEvent from '@testing-library/user-event';
import type { RuleActionsNotifyWhenProps } from './rule_actions_notify_when';
import type { RuleActionsAlertsFilterProps } from './rule_actions_alerts_filter';
import type { RuleActionsAlertsFilterTimeframeProps } from './rule_actions_alerts_filter_timeframe';

jest.mock('./rule_actions_notify_when', () => ({
  RuleActionsNotifyWhen: ({
    showMinimumThrottleUnitWarning,
    showMinimumThrottleWarning,
    onChange,
    onUseDefaultMessage,
  }: RuleActionsNotifyWhenProps) => (
    <div>
      RuleActionsNotifyWhen
      {showMinimumThrottleUnitWarning && <div>showMinimumThrottleUnitWarning</div>}
      {showMinimumThrottleWarning && <div>showMinimumThrottleWarning</div>}
      <button
        onClick={() =>
          onChange({
            summary: true,
            notifyWhen: 'onActionGroupChange',
            throttle: '5m',
          })
        }
      >
        RuleActionsNotifyWhenOnChange
      </button>
      <button onClick={onUseDefaultMessage}>RuleActionsNotifyWhenOnUseDefaultMessage</button>
    </div>
  ),
}));

jest.mock('./rule_actions_alerts_filter', () => ({
  RuleActionsAlertsFilter: ({ onChange }: RuleActionsAlertsFilterProps) => (
    <div>
      RuleActionsAlertsFilter
      <button
        onClick={() =>
          onChange({
            kql: 'test',
            filters: [],
          })
        }
      >
        RuleActionsAlertsFilterButton
      </button>
    </div>
  ),
}));

jest.mock('./rule_actions_alerts_filter_timeframe', () => ({
  RuleActionsAlertsFilterTimeframe: ({ onChange }: RuleActionsAlertsFilterTimeframeProps) => (
    <div>
      RuleActionsAlertsFilterTimeframe
      <button
        onClick={() =>
          onChange({
            days: [1],
            timezone: 'utc',
            hours: {
              start: 'now',
              end: 'now',
            },
          })
        }
      >
        RuleActionsAlertsFilterTimeframeButton
      </button>
    </div>
  ),
}));

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const ruleType = {
  id: '.es-query',
  name: 'Test',
  actionGroups: [
    {
      id: 'testActionGroup',
      name: 'Test Action Group',
    },
    {
      id: 'recovered',
      name: 'Recovered',
    },
  ],
  defaultActionGroupId: 'testActionGroup',
  minimumLicenseRequired: 'basic',
  recoveryActionGroup: 'recovered',
  producer: 'logs',
  authorizedConsumers: {
    alerting: { read: true, all: true },
    test: { read: true, all: true },
    stackAlerts: { read: true, all: true },
    logs: { read: true, all: true },
  },
  actionVariables: {
    params: [],
    state: [],
  },
  enabledInLicense: true,
} as unknown as RuleType;

const ruleModel: RuleTypeModel = {
  id: '.es-query',
  description: 'Sample rule type model',
  iconClass: 'sampleIconClass',
  documentationUrl: 'testurl',
  validate: (params, isServerless) => ({ errors: {} }),
  ruleParamsExpression: () => <div>Expression</div>,
  defaultActionMessage: 'Sample default action message',
  defaultRecoveryMessage: 'Sample default recovery message',
  requiresAppContext: false,
};

const mockOnUseDefaultMessageChange = jest.fn();
const mockOnNotifyWhenChange = jest.fn();
const mockOnActionGroupChange = jest.fn();
const mockOnAlertsFilterChange = jest.fn();
const mockOnTimeframeChange = jest.fn();

const mockDispatch = jest.fn();

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

describe('ruleActionsSettings', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5m' },
      },
      actionErrors: {},
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });
    useRuleFormDispatch.mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should render correctly', () => {
    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.getByTestId('ruleActionsSettings')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionsSettingsSelectActionGroup')).toBeInTheDocument();
  });

  test('should render notify when component', () => {
    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.getByText('RuleActionsNotifyWhen')).toBeInTheDocument();

    expect(screen.queryByText('showMinimumThrottleUnitWarning')).not.toBeInTheDocument();
    expect(screen.queryByText('showMinimumThrottleWarning')).not.toBeInTheDocument();
  });

  test('should render show minimum throttle unit warning', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5h' },
      },
      actionErrors: {},
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1', {
          frequency: {
            throttle: '5m',
            summary: true,
            notifyWhen: 'onActionGroupChange',
          },
        })}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.queryByText('showMinimumThrottleUnitWarning')).toBeInTheDocument();
    expect(screen.queryByText('showMinimumThrottleWarning')).not.toBeInTheDocument();
  });

  test('should render show minimum throttle warning', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5h' },
      },
      actionErrors: {},
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1', {
          frequency: {
            throttle: '4h',
            summary: true,
            notifyWhen: 'onActionGroupChange',
          },
        })}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.queryByText('showMinimumThrottleWarning')).toBeInTheDocument();
    expect(screen.queryByText('showMinimumThrottleUnitWarning')).not.toBeInTheDocument();
  });

  test('should call notifyWhen component event handlers with the correct parameters', async () => {
    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    await userEvent.click(screen.getByText('RuleActionsNotifyWhenOnChange'));

    expect(mockOnNotifyWhenChange).toHaveBeenLastCalledWith({
      notifyWhen: 'onActionGroupChange',
      summary: true,
      throttle: '5m',
    });

    await userEvent.click(screen.getByText('RuleActionsNotifyWhenOnUseDefaultMessage'));

    expect(mockOnUseDefaultMessageChange).toHaveBeenCalled();
  });

  test('should allow for selecting of action groups', async () => {
    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    await userEvent.click(screen.getByTestId('ruleActionsSettingsSelectActionGroup'));

    await userEvent.click(screen.getByTestId('addNewActionConnectorActionGroup-testActionGroup'));

    expect(mockOnActionGroupChange).toHaveBeenLastCalledWith('testActionGroup');
  });

  test('should render alerts filter and filter timeframe inputs', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5h' },
      },
      actionErrors: {},
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: {
        ...ruleType,
        hasFieldsForAAD: true,
      },
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.queryByText('RuleActionsAlertsFilter')).toBeInTheDocument();
    expect(screen.queryByText('RuleActionsAlertsFilterTimeframe')).toBeInTheDocument();
  });

  test('should call filter and filter timeframe onChange', async () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5h' },
      },
      actionErrors: {},
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: {
        ...ruleType,
        hasFieldsForAAD: true,
      },
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    await userEvent.click(screen.getByText('RuleActionsAlertsFilterButton'));
    expect(mockOnAlertsFilterChange).toHaveBeenLastCalledWith({ filters: [], kql: 'test' });

    await userEvent.click(screen.getByText('RuleActionsAlertsFilterTimeframeButton'));
    expect(mockOnTimeframeChange).toHaveBeenLastCalledWith({
      days: [1],
      hours: { end: 'now', start: 'now' },
      timezone: 'utc',
    });
  });

  test('should render filter query error', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'stackAlerts',
        schedule: { interval: '5h' },
      },
      actionsErrors: {
        'uuid-action-1': { filterQuery: ['filter query error'] },
      },
      validConsumers: ['stackAlerts', 'logs'],
      selectedRuleType: {
        ...ruleType,
        hasFieldsForAAD: true,
      },
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.queryByText('filter query error')).toBeInTheDocument();
  });

  test('should show the rule actions filter for siem rule types', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        settings: {},
      },
      formData: {
        consumer: 'siem',
        schedule: { interval: '5h' },
      },
      selectedRuleType: {
        /**
         * With the current configuration
         * hasFieldsForAad will return false
         * and we are testing the isSiemRuleType(ruleTypeId)
         * branch of the code
         */
        ...ruleType,
        id: 'siem.esqlRuleType',
        hasFieldsForAAD: false,
      },
      selectedRuleTypeModel: ruleModel,
    });

    render(
      <RuleActionsSettings
        action={getAction('1')}
        onUseDefaultMessageChange={mockOnUseDefaultMessageChange}
        onNotifyWhenChange={mockOnNotifyWhenChange}
        onActionGroupChange={mockOnActionGroupChange}
        onAlertsFilterChange={mockOnAlertsFilterChange}
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    expect(screen.queryByText('RuleActionsAlertsFilter')).toBeInTheDocument();
  });
});
