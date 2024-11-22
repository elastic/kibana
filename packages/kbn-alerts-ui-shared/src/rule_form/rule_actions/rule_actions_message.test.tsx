/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RuleActionsMessage } from './rule_actions_message';
import { RuleType } from '@kbn/alerting-types';
import { ActionParamsProps, ActionTypeModel, RuleTypeModel } from '../../common';
import { TypeRegistry } from '../../common/type_registry';
import {
  getAction,
  getActionType,
  getActionTypeModel,
  getConnector,
  getSystemAction,
} from '../../common/test_utils/actions_test_utils';
import userEvent from '@testing-library/user-event';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
}));

const { useRuleFormState } = jest.requireMock('../hooks');

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

const mockOnParamsChange = jest.fn();

const mockedActionParamsFields = lazy(async () => ({
  default({ defaultMessage, selectedActionGroupId, errors, editAction }: ActionParamsProps<any>) {
    return (
      <div data-test-subj="actionParamsFieldMock">
        {defaultMessage && <div data-test-subj="defaultMessageMock">{defaultMessage}</div>}
        {selectedActionGroupId && (
          <div data-test-subj="selectedActionGroupIdMock">{selectedActionGroupId}</div>
        )}
        <div data-test-subj="errorsMock">{JSON.stringify(errors)}</div>
        <button
          data-test-subj="editActionMock"
          onClick={() => editAction('paramsKey', { paramsKey: 'paramsValue' }, 1)}
        >
          editAction
        </button>
      </div>
    );
  },
}));

describe('RuleActionsMessage', () => {
  beforeEach(() => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        actionParamsFields: mockedActionParamsFields,
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      actionsParamsErrors: {},
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      connectors: [getConnector('1')],
      connectorTypes: [getActionType('1')],
      aadTemplateFields: [],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should render correctly', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', { actionTypeId: 'actionTypeModel-1' })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByTestId('ruleActionsMessage')).toBeInTheDocument();
  });

  test('should display warning if it exists', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', { actionTypeId: 'actionTypeModel-1' })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText('test warning')).toBeInTheDocument();
  });

  test('should render default action message for normal actions', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', { actionTypeId: 'actionTypeModel-1' })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText('Sample default action message')).toBeInTheDocument();
  });

  test('should render default summary message for actions with summaries', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', {
          actionTypeId: 'actionTypeModel-1',
          frequency: {
            summary: true,
            notifyWhen: 'onActionGroupChange',
            throttle: '5m',
          },
        })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText('Sample default summary message')).toBeInTheDocument();
  });

  test('should render default recovery message for action recovery group', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', {
          actionTypeId: 'actionTypeModel-1',
          group: 'recovered',
        })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText('Sample default recovery message')).toBeInTheDocument();
  });

  test('should render default summary message for system actions', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        actionParamsFields: mockedActionParamsFields,
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      actionsParamsErrors: {},
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      connectors: [getConnector('1')],
      connectorTypes: [
        getActionType('1', {
          isSystemActionType: true,
          id: 'actionTypeModel-1',
        }),
      ],
      aadTemplateFields: [],
    });

    render(
      <RuleActionsMessage
        action={getSystemAction('1', {
          actionTypeId: 'actionTypeModel-1',
        })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText('Sample default summary message')).toBeInTheDocument();
    expect(screen.queryByTestId('selectedActionGroupIdMock')).not.toBeInTheDocument();
  });

  test('should render action param errors if it exists', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        actionParamsFields: mockedActionParamsFields,
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      actionsParamsErrors: {
        'uuid-action-1': { paramsKey: 'error' },
      },
      selectedRuleType: ruleType,
      selectedRuleTypeModel: ruleModel,
      connectors: [getConnector('1')],
      connectorTypes: [getActionType('1')],
      aadTemplateFields: [],
    });

    render(
      <RuleActionsMessage
        action={getAction('1', { actionTypeId: 'actionTypeModel-1' })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    expect(screen.getByText(JSON.stringify({ paramsKey: 'error' }))).toBeInTheDocument();
  });

  test('should call onParamsChange if the params are edited', async () => {
    render(
      <RuleActionsMessage
        action={getAction('1', { actionTypeId: 'actionTypeModel-1' })}
        index={1}
        templateFields={[]}
        useDefaultMessage
        connector={getConnector('1')}
        producerId="stackAlerts"
        warning="test warning"
        onParamsChange={mockOnParamsChange}
      />
    );

    await waitFor(() => {
      return expect(screen.getByTestId('actionParamsFieldMock')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('editActionMock'));
    expect(mockOnParamsChange).toHaveBeenLastCalledWith(
      'paramsKey',
      { paramsKey: 'paramsValue' },
      1
    );
  });
});
