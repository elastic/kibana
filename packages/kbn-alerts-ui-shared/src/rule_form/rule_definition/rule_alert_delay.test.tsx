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

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

describe('RuleAlertDelay', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      formData: {
        alertDelay: {
          active: 5,
        },
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleAlertDelay />);
    expect(screen.getByTestId('alertDelay')).toBeInTheDocument();
  });

  test('Should handle input change', () => {
    render(<RuleAlertDelay />);
    fireEvent.change(screen.getByTestId('alertDelayInput'), {
      target: {
        value: '3',
      },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setAlertDelay',
      payload: { active: 3 },
    });
  });

  test('Should only allow integers as inputs', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        alertDelay: null,
      },
    });

    render(<RuleAlertDelay />);

    ['-', '+', 'e', 'E', '.', 'a', '01'].forEach((char) => {
      fireEvent.change(screen.getByTestId('alertDelayInput'), {
        target: {
          value: char,
        },
      });
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test('Should call onChange with null if empty string is typed', () => {
    render(<RuleAlertDelay />);
    fireEvent.change(screen.getByTestId('alertDelayInput'), {
      target: {
        value: '',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setAlertDelay',
      payload: null,
    });
  });

  test('Should display error when input is invalid', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        alertDelay: {
          active: -5,
        },
      },
      baseErrors: {
        alertDelay: 'Alert delay must be greater than 1.',
      },
    });

    render(<RuleAlertDelay />);

    expect(screen.getByTestId('alertDelayInput')).toBeInvalid();
    expect(screen.getByText('Alert delay must be greater than 1.')).toBeInTheDocument();
  });
});
