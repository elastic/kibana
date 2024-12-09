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
import { RuleType } from '@kbn/alerting-types';
import type { ActionTypeModel, RuleTypeModel } from '@kbn/alerts-ui-shared';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import {
  getAction,
  getActionType,
  getActionTypeModel,
  getConnector,
} from '../common/test_utils/actions_test_utils';
import { RuleActionsItem } from './rule_actions_item';
import userEvent from '@testing-library/user-event';

import { RuleActionsSettingsProps } from './rule_actions_settings';
import { RuleActionsMessageProps } from './rule_actions_message';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('./rule_actions_settings', () => ({
  RuleActionsSettings: ({
    onNotifyWhenChange,
    onActionGroupChange,
    onAlertsFilterChange,
    onTimeframeChange,
  }: RuleActionsSettingsProps) => (
    <div>
      ruleActionsSettings
      <button
        onClick={() =>
          onNotifyWhenChange({
            summary: true,
            notifyWhen: 'onThrottleInterval',
            throttle: '5m',
          })
        }
      >
        onNotifyWhenChange
      </button>
      <button onClick={() => onActionGroupChange('recovered')}>onActionGroupChange</button>
      <button
        onClick={() =>
          onAlertsFilterChange({
            kql: '',
            filters: [],
          })
        }
      >
        onAlertsFilterChange
      </button>
      <button
        onClick={() =>
          onTimeframeChange({
            days: [1, 2, 3],
            timezone: 'UTC',
            hours: {
              start: 'now',
              end: 'now',
            },
          })
        }
      >
        onTimeframeChange
      </button>
    </div>
  ),
}));

jest.mock('./rule_actions_message', () => ({
  RuleActionsMessage: ({ onParamsChange, templateFields }: RuleActionsMessageProps) => (
    <div>
      ruleActionsMessage
      <button onClick={() => onParamsChange('paramsKey', { paramsKey: 'paramsValue' })}>
        onParamsChange
      </button>
    </div>
  ),
}));

jest.mock('../validation/validate_params_for_warnings', () => ({
  validateParamsForWarnings: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/action_variables/get_available_action_variables', () => ({
  getAvailableActionVariables: jest.fn(),
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
  recoveryActionGroup: {
    id: 'recovered',
  },
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
  defaultSummaryMessage: 'Sample default summary message',
  defaultActionMessage: 'Sample default action message',
  defaultRecoveryMessage: 'Sample default recovery message',
  requiresAppContext: false,
};

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const { validateParamsForWarnings } = jest.requireMock(
  '../validation/validate_params_for_warnings'
);

const { getAvailableActionVariables } = jest.requireMock(
  '@kbn/alerts-ui-shared/src/action_variables/get_available_action_variables'
);

const mockConnectors = [getConnector('1', { id: 'action-1' })];

const mockActionTypes = [getActionType('1')];

const mockOnChange = jest.fn();

const mockValidate = jest.fn().mockResolvedValue({
  errors: {},
});

describe('ruleActionsItem', () => {
  beforeEach(() => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        defaultRecoveredActionParams: { recoveredParamKey: 'recoveredParamValue' },
        defaultActionParams: { actionParamKey: 'actionParamValue' },
        validateParams: mockValidate,
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
        http: {
          basePath: {
            publicBaseUrl: 'publicUrl',
          },
        },
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
      aadTemplateFields: [],
      actionsParamsErrors: {},
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    validateParamsForWarnings.mockReturnValue(null);
    getAvailableActionVariables.mockReturnValue(['mockActionVariable']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    expect(screen.getByTestId('ruleActionsItem')).toBeInTheDocument();
    expect(screen.queryByText('ruleActionsSettings')).not.toBeInTheDocument();
    expect(screen.getByText('ruleActionsMessage')).toBeInTheDocument();
  });

  test('should allow for toggling between setting and message', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Message'));

    expect(screen.getByText('ruleActionsMessage')).toBeInTheDocument();
    expect(screen.queryByText('ruleActionsSettings')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Settings'));

    expect(screen.getByText('ruleActionsSettings')).toBeInTheDocument();
    expect(screen.queryByText('ruleActionsMessage')).not.toBeInTheDocument();
  });

  test('should allow notify when to be changed', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', {
          actionTypeId: 'actionType-1',
          group: 'recovered',
        })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Settings'));

    await userEvent.click(screen.getByText('onNotifyWhenChange'));

    expect(mockOnChange).toHaveBeenCalledTimes(3);

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1', value: { recoveredParamKey: 'recoveredParamValue' } },
      type: 'setActionParams',
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: {
        key: 'frequency',
        uuid: 'uuid-action-1',
        value: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '5m' },
      },
      type: 'setActionProperty',
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { errors: {}, uuid: 'uuid-action-1' },
      type: 'setActionParamsError',
    });

    expect(getAvailableActionVariables).toHaveBeenCalledWith(
      { params: [], state: [] },
      undefined,
      {
        defaultActionMessage: 'Sample default recovery message',
        id: 'recovered',
        name: 'Recovered',
        omitMessageVariables: 'all',
      },
      true
    );
  });

  test('should allow alerts filter to be changed', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Settings'));

    await userEvent.click(screen.getByText('onAlertsFilterChange'));

    expect(mockOnChange).toHaveBeenCalledTimes(2);

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: {
        key: 'alertsFilter',
        uuid: 'uuid-action-1',
        value: { query: { filters: [], kql: '' } },
      },
      type: 'setActionProperty',
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { errors: { filterQuery: ['A custom query is required.'] }, uuid: 'uuid-action-1' },
      type: 'setActionError',
    });
  });

  test('should allow timeframe to be changed', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Settings'));

    await userEvent.click(screen.getByText('onTimeframeChange'));

    expect(mockOnChange).toHaveBeenCalledTimes(2);

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: {
        key: 'alertsFilter',
        uuid: 'uuid-action-1',
        value: {
          timeframe: { days: [1, 2, 3], hours: { end: 'now', start: 'now' }, timezone: 'UTC' },
        },
      },
      type: 'setActionProperty',
    });
  });

  test('should allow params to be changed', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Message'));

    await userEvent.click(screen.getByText('onParamsChange'));

    expect(mockOnChange).toHaveBeenCalledTimes(2);

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1', value: { paramsKey: { paramsKey: 'paramsValue' } } },
      type: 'setActionParams',
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { errors: {}, uuid: 'uuid-action-1' },
      type: 'setActionParamsError',
    });
  });

  test('should allow action to be deleted', async () => {
    render(
      <RuleActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('Settings'));

    await userEvent.click(screen.getByTestId('ruleActionsItemDeleteButton'));

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1' },
      type: 'removeAction',
    });
  });
});
