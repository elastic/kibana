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

describe('RuleConsumerSelection', () => {
  test('Renders correctly', () => {
    render(
      <RuleConsumerSelection
        consumers={mockConsumers}
        selectedConsumer={'stackAlerts'}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('ruleConsumerSelection')).toBeInTheDocument();
  });

  test('Should default to the selected consumer', () => {
    render(
      <RuleConsumerSelection
        consumers={mockConsumers}
        selectedConsumer={'stackAlerts'}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('Stack Rules');
  });

  it('Should not display the initial selected consumer if it is not a selectable option', () => {
    render(
      <RuleConsumerSelection
        consumers={['stackAlerts', 'infrastructure']}
        selectedConsumer={'logs'}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('');
  });

  it('should display nothing if there is only 1 consumer to select', () => {
    render(
      <RuleConsumerSelection
        selectedConsumer={null}
        consumers={['stackAlerts']}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByTestId('ruleConsumerSelection')).not.toBeInTheDocument();
  });

  it('should be able to select logs and call onChange', () => {
    render(
      <RuleConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('ruleConsumerSelectionOption-logs'));
    expect(mockOnChange).toHaveBeenLastCalledWith('consumer', 'logs');
  });

  it('should be able to show errors when there is one', () => {
    render(
      <RuleConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{ consumer: ['Scope is required'] }}
      />
    );
    expect(screen.queryAllByText('Scope is required')).toHaveLength(1);
  });
});
