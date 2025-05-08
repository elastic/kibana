/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { fireEvent, render, waitFor, within, screen } from '@testing-library/react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Frequency } from '@kbn/rrule';
import type { RecurringSchedule } from '../types';
import { formSchema } from '../schemas/form_schema';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { RecurrenceEnd } from '../constants';

const initialValue: RecurringSchedule = {
  frequency: 'CUSTOM',
  ends: RecurrenceEnd.NEVER,
};

const TestComponent = ({
  children,
  iv = initialValue,
}: PropsWithChildren<{ iv?: RecurringSchedule }>) => {
  const { form } = useForm<RecurringSchedule>({
    defaultValue: iv,
    options: { stripEmptyFields: false },
    schema: formSchema,
  });

  return <Form form={form}>{children}</Form>;
};

describe('CustomRecurringSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', async () => {
    render(
      <TestComponent>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    expect(screen.getByTestId('interval-field')).toBeInTheDocument();
    expect(screen.getByTestId('custom-frequency-field')).toBeInTheDocument();
    expect(screen.getByTestId('byweekday-field')).toBeInTheDocument();
    expect(screen.queryByTestId('bymonth-field')).not.toBeInTheDocument();
  });

  it('renders byweekday field if custom frequency = weekly', async () => {
    render(
      <TestComponent>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    fireEvent.change(
      within(screen.getByTestId('custom-frequency-field')).getByTestId(
        'customRecurringScheduleFrequencySelect'
      ),
      {
        target: { value: Frequency.WEEKLY },
      }
    );
    await waitFor(() => expect(screen.getByTestId('byweekday-field')).toBeInTheDocument());
  });

  it('renders byweekday field if frequency = daily', async () => {
    const iv: RecurringSchedule = {
      ...initialValue,
      frequency: Frequency.DAILY,
      ends: RecurrenceEnd.NEVER,
    };
    render(
      <TestComponent iv={iv}>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    expect(screen.getByTestId('byweekday-field')).toBeInTheDocument();
  });

  it('renders bymonth field if custom frequency = monthly', async () => {
    render(
      <TestComponent>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    fireEvent.change(
      within(screen.getByTestId('custom-frequency-field')).getByTestId(
        'customRecurringScheduleFrequencySelect'
      ),
      {
        target: { value: Frequency.MONTHLY },
      }
    );
    await waitFor(() => expect(screen.getByTestId('bymonth-field')).toBeInTheDocument());
  });

  it('should initialize the form when no initialValue provided', () => {
    render(
      <TestComponent>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    const frequencyInput = within(screen.getByTestId('custom-frequency-field')).getByTestId(
      'customRecurringScheduleFrequencySelect'
    );
    const intervalInput = within(screen.getByTestId('interval-field')).getByTestId(
      'customRecurringScheduleIntervalInput'
    );

    expect(frequencyInput).toHaveValue('2');
    expect(intervalInput).toHaveValue(1);
  });

  it('should prefill the form when provided with initialValue', () => {
    const iv: RecurringSchedule = {
      ...initialValue,
      frequency: 'CUSTOM',
      ends: RecurrenceEnd.NEVER,
      customFrequency: Frequency.WEEKLY,
      interval: 3,
      byweekday: { 1: false, 2: false, 3: true, 4: true, 5: false, 6: false, 7: false },
    };
    render(
      <TestComponent iv={iv}>
        <CustomRecurringSchedule />
      </TestComponent>
    );

    const frequencyInput = within(screen.getByTestId('custom-frequency-field')).getByTestId(
      'customRecurringScheduleFrequencySelect'
    );
    const intervalInput = within(screen.getByTestId('interval-field')).getByTestId(
      'customRecurringScheduleIntervalInput'
    );
    const input3 = within(screen.getByTestId('byweekday-field'))
      .getByTestId('isoWeekdays3')
      .getAttribute('aria-pressed');
    const input4 = within(screen.getByTestId('byweekday-field'))
      .getByTestId('isoWeekdays4')
      .getAttribute('aria-pressed');
    expect(frequencyInput).toHaveValue('2');
    expect(intervalInput).toHaveValue(3);
    expect(input3).toBe('true');
    expect(input4).toBe('true');
  });
});
