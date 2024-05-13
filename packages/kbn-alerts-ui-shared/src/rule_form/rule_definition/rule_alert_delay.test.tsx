/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleAlertDelay } from './rule_alert_delay';

const mockOnChange = jest.fn();

describe('RuleAlertDelay', () => {
  test('Renders correctly', () => {
    render(
      <RuleAlertDelay
        alertDelay={{
          active: 5,
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('alertDelay')).toBeInTheDocument();
  });

  test('Should handle input change', () => {
    render(
      <RuleAlertDelay
        alertDelay={{
          active: 5,
        }}
        onChange={mockOnChange}
      />
    );

    fireEvent.change(screen.getByTestId('alertDelayInput'), {
      target: {
        value: '3',
      },
    });

    expect(mockOnChange).toHaveBeenCalledWith('alertDelay', { active: 3 });
  });

  test('Should display error when input is invalid', () => {
    render(
      <RuleAlertDelay
        alertDelay={{
          active: -5,
        }}
        errors={{
          alertDelay: 'Alert delay must be greater than 1.',
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Alert delay must be greater than 1.')).toBeInTheDocument();
  });
});
