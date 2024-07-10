/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleActions } from './rule_actions';

const http = httpServiceMock.createStartContract();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('./rule_actions_system_actions_item', () => ({
  RuleActionsSystemActionsItem: <div>RuleActionsSystemActionsItem</div>,
}));

jest.mock('./rule_actions_item', () => ({
  RuleActionsItem: <div>RuleActionsItem</div>,
}));

jest.mock('./rule_actions_connectors_modal', () => ({
  RuleActionsConnectorsModal: <div>RuleActionsConnectorsModal</div>,
}));

jest.mock('../../common/hooks', () => ({
  useLoadConnectors: jest.fn(),
  useLoadConnectorTypes: jest.fn(),
  useLoadRuleTypeAadTemplateField: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const { useLoadConnectors, useLoadConnectorTypes, useLoadRuleTypeAadTemplateField } =
  jest.requireMock('../../common/hooks');

const mockOnChange = jest.fn();

describe('Rule actions', () => {
  beforeEach(() => {
    useLoadConnectors.mockReturnValue({
      data: [],
      isInitialLoading: false,
    });
    useLoadConnectorTypes.mockReturnValue({
      data: [],
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
        actions: [],
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

  test('Renders correctly', () => {
    render(<RuleActions />);

    expect(screen.getByTestId('ruleActions')).toBeInTheDocument();
  });
});
