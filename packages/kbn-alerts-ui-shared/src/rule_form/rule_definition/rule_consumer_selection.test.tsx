/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleConsumerSelection } from './rule_consumer_selection';

const mockOnChange = jest.fn();
const mockConsumers: RuleCreationValidConsumer[] = ['logs', 'infrastructure', 'stackAlerts'];

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

describe('RuleConsumerSelection', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      multiConsumerSelection: 'stackAlerts',
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleConsumerSelection validConsumers={mockConsumers} />);
    expect(screen.getByTestId('ruleConsumerSelection')).toBeInTheDocument();
  });

  test('Should default to the selected consumer', () => {
    render(<RuleConsumerSelection validConsumers={mockConsumers} />);
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('Stack Rules');
  });

  it('Should not display the initial selected consumer if it is not a selectable option', () => {
    useRuleFormState.mockReturnValue({
      multiConsumerSelection: 'logs',
    });
    render(<RuleConsumerSelection validConsumers={['stackAlerts', 'infrastructure']} />);
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('');
  });

  it('should display nothing if there is only 1 consumer to select', () => {
    useRuleFormState.mockReturnValue({
      multiConsumerSelection: null,
    });
    render(<RuleConsumerSelection validConsumers={['stackAlerts']} />);

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  it('should be able to select logs and call onChange', () => {
    useRuleFormState.mockReturnValue({
      multiConsumerSelection: null,
    });
    render(<RuleConsumerSelection validConsumers={mockConsumers} />);

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('ruleConsumerSelectionOption-logs'));
    expect(mockOnChange).toHaveBeenLastCalledWith({
      type: 'setMultiConsumer',
      payload: 'logs',
    });
  });

  it('should be able to show errors when there is one', () => {
    useRuleFormState.mockReturnValue({
      multiConsumerSelection: null,
      baseErrors: { consumer: ['Scope is required'] },
    });
    render(<RuleConsumerSelection validConsumers={mockConsumers} />);
    expect(screen.queryAllByText('Scope is required')).toHaveLength(1);
  });
});
