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

import { HourPicker } from './hour_picker';

describe('HourPicker', () => {
  it('renders 48 half-hour options', () => {
    renderWithEuiTheme(<HourPicker selectedHour={undefined} onHourChange={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(48);
  });

  it('renders selected hour as primary EuiButton', () => {
    renderWithEuiTheme(<HourPicker selectedHour="3:30" onHourChange={() => {}} />);

    expect(screen.getByRole('button', { name: '3:30' }).className).toContain('euiButton');
  });

  it('renders non-selected hours as EuiButtonEmpty', () => {
    renderWithEuiTheme(<HourPicker selectedHour="3:30" onHourChange={() => {}} />);

    expect(screen.getByRole('button', { name: '3:00' }).className).toContain('euiButtonEmpty');
  });

  it('calls onHourChange with clicked hour value', () => {
    const onHourChange = jest.fn();
    renderWithEuiTheme(<HourPicker selectedHour={undefined} onHourChange={onHourChange} />);

    fireEvent.click(screen.getByRole('button', { name: '10:30' }));

    expect(onHourChange).toHaveBeenCalledWith('10:30');
  });
});

