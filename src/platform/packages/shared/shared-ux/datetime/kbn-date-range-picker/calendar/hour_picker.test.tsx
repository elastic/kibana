/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { HourPicker, HOURS } from './hour_picker';

describe('HourPicker', () => {
  it('renders all 48 half-hour options from 00:00 to 23:30', () => {
    renderWithEuiTheme(<HourPicker selectedHour={undefined} onHourChange={() => {}} />);

    const labels = screen.getAllByRole('button').map((btn) => btn.textContent);
    expect(labels).toEqual(HOURS);
  });

  it('marks the selected hour with aria-current', () => {
    renderWithEuiTheme(<HourPicker selectedHour="03:30" onHourChange={() => {}} />);

    expect(screen.getByRole('button', { name: '03:30' })).toHaveAttribute('aria-current', 'true');
  });

  it('does not mark unselected hours with aria-current', () => {
    renderWithEuiTheme(<HourPicker selectedHour="03:30" onHourChange={() => {}} />);

    expect(screen.getByRole('button', { name: '03:00' })).not.toHaveAttribute('aria-current');
  });

  it('calls onHourChange with clicked hour value', () => {
    const onHourChange = jest.fn();
    renderWithEuiTheme(<HourPicker selectedHour={undefined} onHourChange={onHourChange} />);

    fireEvent.click(screen.getByRole('button', { name: '10:30' }));

    expect(onHourChange).toHaveBeenCalledWith('10:30');
  });
});
