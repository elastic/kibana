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
import userEvent from '@testing-library/user-event';
import { TypeRegistry } from '../../common/type_registry';
import {
  getAction,
  getActionType,
  getActionTypeModel,
  getConnector,
} from '../../common/test_utils/actions_test_utils';
import { ActionTypeModel } from '../../common';
import { RuleActionsMessageProps } from './rule_actions_message';
import { RuleActionsSystemActionsItem } from './rule_actions_system_actions_item';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('./rule_actions_message', () => ({
  RuleActionsMessage: ({ onParamsChange, warning }: RuleActionsMessageProps) => (
    <div>
      RuleActionsMessage
      <button onClick={() => onParamsChange('param', { paramKey: 'someValue' })}>
        RuleActionsMessageButton
      </button>
      {warning && <div>{warning}</div>}
    </div>
  ),
}));

jest.mock('../validation/validate_params_for_warnings', () => ({
  validateParamsForWarnings: jest.fn(),
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

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const { validateParamsForWarnings } = jest.requireMock(
  '../validation/validate_params_for_warnings'
);

const mockConnectors = [getConnector('1', { id: 'action-1' })];

const mockActionTypes = [getActionType('1')];

const mockOnChange = jest.fn();

const mockValidate = jest.fn().mockResolvedValue({
  errors: {},
});

describe('ruleActionsSystemActionsItem', () => {
  beforeEach(() => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
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
      actionsParamsErrors: {},
      selectedRuleType: ruleType,
      aadTemplateFields: [],
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    validateParamsForWarnings.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', () => {
    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    expect(screen.getByTestId('ruleActionsSystemActionsItem')).toBeInTheDocument();
    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.getByText('actionType: 1')).toBeInTheDocument();

    expect(screen.getByTestId('ruleActionsSystemActionsItemAccordionContent')).toBeVisible();
    expect(screen.getByText('RuleActionsMessage')).toBeInTheDocument();
  });

  test('should be able to hide the accordion content', async () => {
    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByTestId('ruleActionsSystemActionsItemAccordionButton'));

    expect(screen.getByTestId('ruleActionsSystemActionsItemAccordionContent')).not.toBeVisible();
  });

  test('should be able to delete the action', async () => {
    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByTestId('ruleActionsSystemActionsItemDeleteActionButton'));
    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1' },
      type: 'removeAction',
    });
  });

  test('should render error icon if error exists', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
        http: {
          basePath: {
            publicBaseUrl: 'publicUrl',
          },
        },
      },
      actionsParamsErrors: {
        'uuid-action-1': {
          param: ['something went wrong!'],
        },
      },
      selectedRuleType: ruleType,
      aadTemplateFields: [],
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByTestId('ruleActionsSystemActionsItemAccordionButton'));

    expect(screen.getByTestId('action-group-error-icon')).toBeInTheDocument();
  });

  test('should allow params to be changed', async () => {
    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('RuleActionsMessageButton'));

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1', value: { param: { paramKey: 'someValue' } } },
      type: 'setActionParams',
    });
    expect(mockValidate).toHaveBeenCalledWith({ param: { paramKey: 'someValue' } });
  });

  test('should set warning and error if params have errors', async () => {
    validateParamsForWarnings.mockReturnValue('warning message!');

    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        validateParams: mockValidate.mockResolvedValue({
          errors: { paramsValue: ['something went wrong!'] },
        }),
      })
    );

    render(
      <RuleActionsSystemActionsItem
        action={getAction('1', { actionTypeId: 'actionType-1' })}
        index={0}
        producerId="stackAlerts"
      />
    );

    await userEvent.click(screen.getByText('RuleActionsMessageButton'));

    expect(mockOnChange).toHaveBeenCalledTimes(2);
    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { uuid: 'uuid-action-1', value: { param: { paramKey: 'someValue' } } },
      type: 'setActionParams',
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: { errors: { paramsValue: ['something went wrong!'] }, uuid: 'uuid-action-1' },
      type: 'setActionParamsError',
    });

    expect(screen.getByText('warning message!')).toBeInTheDocument();
  });
});
