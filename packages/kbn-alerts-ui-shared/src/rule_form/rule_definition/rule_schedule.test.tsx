/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleSchedule } from './rule_schedule';

const mockOnChange = jest.fn();

describe('RuleSchedule', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleSchedule interval={'5m'} onChange={mockOnChange} />);

    expect(screen.getByTestId('ruleSchedule')).toBeInTheDocument();
  });

  test('Should allow interval number to be changed', () => {
    render(<RuleSchedule interval={'5m'} onChange={mockOnChange} />);

    fireEvent.change(screen.getByTestId('ruleScheduleNumberInput'), {
      target: {
        value: '10',
      },
    });
    expect(mockOnChange).toHaveBeenCalledWith('interval', '10m');
  });

  test('Should allow interval unit to be changed', () => {
    render(<RuleSchedule interval={'5m'} onChange={mockOnChange} />);

    userEvent.selectOptions(screen.getByTestId('ruleScheduleUnitInput'), 'hours');
    expect(mockOnChange).toHaveBeenCalledWith('interval', '5h');
  });

  test('Should only allow integers as inputs', async () => {
    render(<RuleSchedule interval={'5m'} onChange={mockOnChange} />);

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
    render(
      <RuleSchedule
        interval={'5m'}
        errors={{
          interval: 'something went wrong!',
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('something went wrong!')).toBeInTheDocument();
  });

  test('Should enforce minimum schedule interval', () => {
    render(
      <RuleSchedule
        interval={'30s'}
        minimumScheduleInterval={{
          enforce: true,
          value: '1m',
        }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Interval must be at least 1 minute.')).toBeInTheDocument();
  });
});
