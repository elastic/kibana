/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleActionsConnectorsBody } from './rule_actions_connectors_body';
import type { ActionConnector, ActionTypeModel } from '@kbn/alerts-ui-shared';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionType } from '@kbn/actions-types';
import {
  getActionType,
  getActionTypeModel,
  getConnector,
} from '../common/test_utils/actions_test_utils';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('../utils', () => ({
  getDefaultParams: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const mockConnectors: ActionConnector[] = [getConnector('1'), getConnector('2')];

const mockActionTypes: ActionType[] = [getActionType('1'), getActionType('2')];

const mockOnSelectConnector = jest.fn();

const mockOnChange = jest.fn();

describe('ruleActionsConnectorsBody', () => {
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
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call onSelectConnector when connector is clicked', async () => {
    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    await userEvent.click(screen.getByText('connector-1'));
    await waitFor(() =>
      expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
        actionTypeId: 'actionType-1',
        config: { config: 'config-1' },
        id: 'connector-1',
        isDeprecated: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'connector-1',
        secrets: { secret: 'secret' },
      })
    );

    await userEvent.click(screen.getByText('connector-2'));
    await waitFor(() =>
      expect(mockOnSelectConnector).toHaveBeenLastCalledWith({
        actionTypeId: 'actionType-2',
        config: { config: 'config-2' },
        id: 'connector-2',
        isDeprecated: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'connector-2',
        secrets: { secret: 'secret' },
      })
    );
  });

  test('filters out when no connector matched action type id', async () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getActionTypeModel('1', { id: 'actionType-1' }));

    useRuleFormState.mockReturnValue({
      plugins: {
        actionTypeRegistry,
      },
      formData: {
        actions: [],
      },
      connectors: [
        ...mockConnectors,
        {
          id: `connector-foobar-1`,
          secrets: { secret: 'secret' },
          actionTypeId: `actionType-foobar`,
          name: `connector-foobar`,
          config: { config: `config-foobar-1` },
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
        },
      ],
      connectorTypes: mockActionTypes,
      aadTemplateFields: [],
      selectedRuleType: {
        defaultActionGroupId: 'default',
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    render(<RuleActionsConnectorsBody onSelectConnector={mockOnSelectConnector} />);

    expect(screen.queryByText('connector-foobar')).not.toBeInTheDocument();
    expect(screen.queryByText('connector-2')).not.toBeInTheDocument();

    expect(await screen.findAllByTestId('ruleActionsConnectorsModalCard')).toHaveLength(1);
    expect(await screen.findByText('connector-1')).toBeInTheDocument();
  });
});
