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
import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleActions } from './rule_actions';
import {
  getActionType,
  getAction,
  getSystemAction,
  getConnector,
} from '../../common/test_utils/actions_test_utils';
import { RuleActionsConnectorsModalProps } from './rule_actions_connectors_modal';
import userEvent from '@testing-library/user-event';

const http = httpServiceMock.createStartContract();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('./rule_actions_system_actions_item', () => ({
  RuleActionsSystemActionsItem: () => <div>RuleActionsSystemActionsItem</div>,
}));

jest.mock('./rule_actions_item', () => ({
  RuleActionsItem: () => <div>RuleActionsItem</div>,
}));

jest.mock('./rule_actions_connectors_modal', () => ({
  RuleActionsConnectorsModal: ({
    onSelectConnector,
    connectors,
  }: RuleActionsConnectorsModalProps) => (
    <div>
      RuleActionsConnectorsModal
      <button onClick={() => onSelectConnector(connectors[0])}>select connector</button>
    </div>
  ),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

jest.mock('../../common/hooks', () => ({
  useLoadConnectors: jest.fn(),
  useLoadConnectorTypes: jest.fn(),
  useLoadRuleTypeAadTemplateField: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const { useLoadConnectors, useLoadConnectorTypes, useLoadRuleTypeAadTemplateField } =
  jest.requireMock('../../common/hooks');

const mockConnectors = [getConnector('1')];
const mockConnectorTypes = [
  getActionType('1'),
  getActionType('2'),
  getActionType('3', { isSystemActionType: true }),
];

const mockActions = [getAction('1'), getAction('2')];
const mockSystemActions = [getSystemAction('3')];

const mockOnChange = jest.fn();

describe('ruleActions', () => {
  beforeEach(() => {
    useLoadConnectors.mockReturnValue({
      data: mockConnectors,
      isInitialLoading: false,
    });
    useLoadConnectorTypes.mockReturnValue({
      data: mockConnectorTypes,
      isInitialLoading: false,
    });
    useLoadRuleTypeAadTemplateField.mockReturnValue({
      data: {},
      isInitialLoading: false,
    });
    useRuleFormState.mockReturnValue({
      plugins: {
        http,
      },
      formData: {
        actions: [...mockActions, ...mockSystemActions],
        consumer: 'stackAlerts',
      },
      selectedRuleType: {
        id: 'selectedRuleTypeId',
        defaultActionGroupId: 'test',
        producer: 'stackAlerts',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RuleActions />);

    expect(screen.getByTestId('ruleActions')).toBeInTheDocument();
    expect(screen.getByTestId('ruleActionsAddActionButton')).toBeInTheDocument();
    expect(screen.queryByText('RuleActionsConnectorsModal')).not.toBeInTheDocument();
  });

  test('renders actions correctly', () => {
    render(<RuleActions />);

    expect(screen.getAllByText('RuleActionsItem').length).toEqual(2);
    expect(screen.getAllByText('RuleActionsSystemActionsItem').length).toEqual(1);
  });

  test('should show no actions if none are selected', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        http,
      },
      formData: {
        actions: [],
        consumer: 'stackAlerts',
      },
      selectedRuleType: {
        id: 'selectedRuleTypeId',
        defaultActionGroupId: 'test',
        producer: 'stackAlerts',
      },
    });

    render(<RuleActions />);
    expect(screen.queryAllByText('RuleActionsItem').length).toEqual(0);
    expect(screen.queryAllByText('RuleActionsSystemActionsItem').length).toEqual(0);
  });

  test('should be able to open the connector modal', () => {
    render(<RuleActions />);

    userEvent.click(screen.getByTestId('ruleActionsAddActionButton'));
    expect(screen.getByText('RuleActionsConnectorsModal')).toBeInTheDocument();
  });

  test('should call onSelectConnector with the correct parameters', () => {
    render(<RuleActions />);

    userEvent.click(screen.getByTestId('ruleActionsAddActionButton'));
    expect(screen.getByText('RuleActionsConnectorsModal')).toBeInTheDocument();

    userEvent.click(screen.getByText('select connector'));

    expect(mockOnChange).toHaveBeenCalledWith({
      payload: {
        actionTypeId: 'actionType-1',
        frequency: { notifyWhen: 'onActionGroupChange', summary: false, throttle: null },
        group: 'test',
        id: 'connector-1',
        params: {},
        uuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      type: 'addAction',
    });

    expect(screen.queryByText('RuleActionsConnectorsModal')).not.toBeInTheDocument();
  });
});
