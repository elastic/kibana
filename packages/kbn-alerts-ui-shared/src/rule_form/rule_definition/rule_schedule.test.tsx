/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleSchedule } from './rule_schedule';

const mockOnChange = jest.fn();

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

describe('RuleSchedule', () => {
  beforeEach(() => {
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '5m',
        },
      },
    });
    render(<RuleSchedule />);

    expect(screen.getByTestId('ruleSchedule')).toBeInTheDocument();
  });

  test('Should allow interval number to be changed', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '5m',
        },
      },
    });
    render(<RuleSchedule />);

    fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
      target: {
        value: '10',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setSchedule',
      payload: {
        interval: '10m',
      },
    });
  });

  test('Should allow interval unit to be changed', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '5m',
        },
      },
    });
    render(<RuleSchedule />);

    userEvent.selectOptions(screen.getByTestId('ruleScheduleUnitInput'), 'hours');
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setSchedule',
      payload: {
        interval: '5h',
      },
    });
  });

  test('Should only allow integers as inputs', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '5m',
        },
      },
    });
    render(<RuleSchedule />);

    ['-', '+', 'e', 'E', '.', 'a', '01'].forEach((char) => {
      fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
        target: {
          value: char,
        },
      });
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test('Should display error properly', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '5m',
        },
      },
      baseErrors: {
        interval: 'something went wrong!',
      },
    });
    render(<RuleSchedule />);

    expect(screen.getByText('something went wrong!')).toBeInTheDocument();
    expect(screen.getByTestId('ruleScheduleNumberInput')).toBeInvalid();
  });

  test('Should enforce minimum schedule interval', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        schedule: {
          interval: '30s',
        },
      },
      minimumScheduleInterval: {
        enforce: true,
        value: '1m',
      },
    });
    render(<RuleSchedule />);

    expect(screen.getByText('Interval must be at least 1 minute.')).toBeInTheDocument();
  });
});
