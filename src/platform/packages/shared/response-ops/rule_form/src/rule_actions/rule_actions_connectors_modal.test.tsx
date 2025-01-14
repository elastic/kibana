/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleActionsConnectorsModal } from './rule_actions_connectors_modal';
import type { ActionConnector, ActionTypeModel } from '@kbn/alerts-ui-shared';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import { ActionType } from '@kbn/actions-types';
import {
  getActionType,
  getActionTypeModel,
  getConnector,
} from '../common/test_utils/actions_test_utils';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const mockConnectors: ActionConnector[] = [getConnector('1'), getConnector('2')];

const mockActionTypes: ActionType[] = [getActionType('1'), getActionType('2')];

const mockOnClose = jest.fn();

const mockOnSelectConnector = jest.fn();

const mockOnChange = jest.fn();

describe('ruleActionsConnectorsModal', () => {
  beforeEach(() => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
      aadTemplateFields: [],
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );
    expect(screen.getByTestId('ruleActionsConnectorsModal'));
  });

  test('should render connectors and filters', () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.getByText('connector-2')).toBeInTheDocument();

    expect(screen.getByTestId('ruleActionsConnectorsModalSearch')).toBeInTheDocument();
    expect(screen.getAllByTestId('ruleActionsConnectorsModalFilterButton').length).toEqual(3);

    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');
    expect(within(filterButtonGroup).getByText('actionType: 1')).toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('actionType: 2')).toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('All')).toBeInTheDocument();
  });

  test('should allow for searching of connectors', async () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    // Type first connector
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'connector-1');
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-1')).toBeInTheDocument();

    // Clear
    await userEvent.clear(screen.getByTestId('ruleActionsConnectorsModalSearch'));

    // Type second connector
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'actionType: 2');
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-2')).toBeInTheDocument();

    // Clear
    await userEvent.clear(screen.getByTestId('ruleActionsConnectorsModalSearch'));

    // Type a connector that doesn't exist
    await userEvent.type(screen.getByTestId('ruleActionsConnectorsModalSearch'), 'doesntexist');
    expect(screen.getByTestId('ruleActionsConnectorsModalEmpty')).toBeInTheDocument();

    // Clear
    await userEvent.click(screen.getByTestId('ruleActionsConnectorsModalClearFiltersButton'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
  });

  test('should allow for filtering of connectors', async () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 1'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);
    expect(screen.getByText('connector-1')).toBeInTheDocument();

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 2'));
    expect(screen.getByText('connector-2')).toBeInTheDocument();
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(1);

    await userEvent.click(within(filterButtonGroup).getByText('All'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
  });

  test('should call onSelectConnector when connector is clicked', async () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    await userEvent.click(screen.getByText('connector-1'));
    expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
      actionTypeId: 'actionType-1',
      config: { config: 'config-1' },
      id: 'connector-1',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      name: 'connector-1',
      secrets: { secret: 'secret' },
    });

    await userEvent.click(screen.getByText('connector-2'));
    expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
      actionTypeId: 'actionType-2',
      config: { config: 'config-2' },
      id: 'connector-2',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      name: 'connector-2',
      secrets: { secret: 'secret' },
    });
  });

  test('should not render connector if action type doesnt exist', () => {
    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.queryByText('connector2')).not.toBeInTheDocument();
  });

  test('should not render connector if hideInUi is true', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2', hideInUi: true }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.queryByText('connector2')).not.toBeInTheDocument();
  });

  test('should not render connector filter if hideInUi is true', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        hideInUi: true,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );
    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');
    expect(within(filterButtonGroup).getByText('actionType: 1')).toBeInTheDocument();
    expect(within(filterButtonGroup).queryByText('actionType: 2')).not.toBeInTheDocument();
    expect(within(filterButtonGroup).getByText('All')).toBeInTheDocument();

    expect(screen.getAllByTestId('ruleActionsConnectorsModalFilterButton').length).toEqual(2);
  });

  test('should display connectors if hideInUi is true and it has subtype', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(
      getActionTypeModel('1', {
        id: 'actionType-1',
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        hideInUi: true,
        subtype: [
          { id: 'actionType-1', name: 'connector-1' },
          { id: 'actionType-2', name: 'connector-2' },
        ],
      })
    );
    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );
    const filterButtonGroup = screen.getByTestId('ruleActionsConnectorsModalFilterButtonGroup');

    await userEvent.click(within(filterButtonGroup).getByText('actionType: 1'));
    expect(screen.getAllByTestId('ruleActionsConnectorsModalCard').length).toEqual(2);
    expect(screen.getByText('connector-1')).toBeInTheDocument();
    expect(screen.getByText('connector-2')).toBeInTheDocument();
  });

  test('should not render connector if actionsParamsField doesnt exist', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(
      getActionTypeModel('2', {
        id: 'actionType-2',
        actionParamsFields: null as unknown as React.LazyExoticComponent<any>,
      })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: mockActionTypes,
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();
  });

  test('should not render connector if the action type is not enabled', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInConfig: false })],
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();
  });

  test('should render connector if the action is not enabled but its a preconfigured connector', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: [getConnector('1'), getConnector('2', { isPreconfigured: true })],
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInConfig: false })],
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.getByText('connector-2')).toBeInTheDocument();
  });

  test('should disable connector if it fails license check', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(getActionTypeModel('2', { id: 'actionType-2' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { enabledInLicense: false })],
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.getByText('connector-2')).toBeDisabled();
  });

  test('should disable connector if its a selected system action', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));
    actionTypeRegistry.register(
      getActionTypeModel('2', { isSystemActionType: true, id: 'actionType-2' })
    );

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [{ actionTypeId: 'actionType-2' }],
      },
      connectors: mockConnectors,
      connectorTypes: [getActionType('1'), getActionType('2', { isSystemActionType: true })],
    });

    render(
      <RuleActionsConnectorsModal onClose={mockOnClose} onSelectConnector={mockOnSelectConnector} />
    );

    expect(screen.getByText('connector-2')).toBeDisabled();
  });
});
