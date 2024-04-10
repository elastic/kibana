/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleFormConsumerSelection } from './rule_form_consumer_selection';
import { IncompleteError } from '../../common/validation_error';
import { renderWithProviders, waitForFormToLoad } from '../../common/test_utils';

const mockConsumers: RuleCreationValidConsumer[] = ['logs', 'infrastructure', 'stackAlerts'];

describe('RuleFormConsumerSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithProviders(<RuleFormConsumerSelection validConsumers={mockConsumers} errors={{}} />);

    await waitForFormToLoad();
    expect(screen.getByTestId('ruleFormConsumerSelect')).toBeInTheDocument();
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveAttribute(
      'placeholder',
      'Select a scope'
    );
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('');
    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Stack Rules')).toBeInTheDocument();
  });

  it('should be able to show an error when there is one', async () => {
    renderWithProviders(
      <RuleFormConsumerSelection
        validConsumers={mockConsumers}
        errors={{ consumer: [IncompleteError('Scope is required')] }}
      />
    );
    await waitForFormToLoad();

    expect(screen.queryAllByText('Scope is required')).toHaveLength(1);
  });

  it('should display nothing if there is only 1 consumer to select', async () => {
    renderWithProviders(<RuleFormConsumerSelection validConsumers={['stackAlerts']} errors={{}} />);
    await waitForFormToLoad();

    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display nothing if observability is one of the consumers', async () => {
    renderWithProviders(
      <RuleFormConsumerSelection validConsumers={['logs', 'observability']} errors={{}} />
    );

    await waitForFormToLoad();

    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display the initial consumer from app context', async () => {
    renderWithProviders(<RuleFormConsumerSelection validConsumers={mockConsumers} errors={{}} />, {
      appContext: {
        consumer: 'logs',
        validConsumers: mockConsumers,
      },
    });

    await waitForFormToLoad();

    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('Logs');
  });

  it('should not display the initial selected consumer if it is not a selectable option', async () => {
    renderWithProviders(
      <RuleFormConsumerSelection validConsumers={['stackAlerts', 'infrastructure']} errors={{}} />,
      {
        appContext: {
          consumer: 'logs',
          validConsumers: mockConsumers,
        },
      }
    );
    await waitForFormToLoad();
    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('');
  });
});
