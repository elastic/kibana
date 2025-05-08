/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Frequency } from '@kbn/rrule';
import { render, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecurringScheduleForm, RecurringScheduleFormProps } from './recurring_schedule_form';
import { RecurrenceEnd } from '../constants';

const baseProps: RecurringScheduleFormProps = {
  startDate: '2023-03-24',
  recurringSchedule: {
    frequency: Frequency.YEARLY,
    ends: RecurrenceEnd.NEVER,
  },
  onRecurringScheduleChange: jest.fn(),
};

describe('RecurringScheduleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', async () => {
    render(<RecurringScheduleForm {...baseProps} />);

    expect(screen.getByTestId('frequency-field')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-recurring-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('ends-field')).toBeInTheDocument();
    expect(screen.queryByTestId('until-field')).not.toBeInTheDocument();
    expect(screen.queryByTestId('count-field')).not.toBeInTheDocument();
  });

  it('renders until field if ends = on_date', async () => {
    render(<RecurringScheduleForm {...baseProps} />);

    const btn = within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionOnDate');

    await userEvent.click(btn);
    expect(await screen.findByTestId('until-field')).toBeInTheDocument();
  });

  it('renders until field if ends = after_x', async () => {
    render(<RecurringScheduleForm {...baseProps} />);

    const btn = within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionAfterX');

    await userEvent.click(btn);
    expect(await screen.findByTestId('count-field')).toBeInTheDocument();
  });

  it('should initialize the form when no recurringSchedule provided', () => {
    render(<RecurringScheduleForm {...baseProps} recurringSchedule={undefined} />);

    const frequencyInput = within(screen.getByTestId('frequency-field')).getByTestId(
      'recurringScheduleRepeatSelect'
    );
    const endsInput = within(screen.getByTestId('ends-field')).getByTestId(
      'recurrenceEndOptionNever'
    );

    expect(frequencyInput).toHaveValue('3');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
  });

  it('should prefill the form when provided with recurringSchedule', () => {
    render(
      <RecurringScheduleForm
        {...baseProps}
        recurringSchedule={{
          frequency: Frequency.MONTHLY,
          ends: RecurrenceEnd.ON_DATE,
          until: '2023-03-24',
        }}
      />
    );

    const frequencyInput = within(screen.getByTestId('frequency-field')).getByTestId(
      'recurringScheduleRepeatSelect'
    );
    const endsInput = within(screen.getByTestId('ends-field')).getByTestId(
      'recurrenceEndOptionOnDate'
    );
    const untilInput = within(screen.getByTestId('until-field')).getByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    expect(frequencyInput).toHaveValue('1');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
    expect(untilInput).toHaveValue('03/24/2023');
  });
});
