/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { KbnSuperDatePicker } from './superdatepicker';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const onTimeChangeMock = jest.fn();
const getEntireTimeRangeMock = jest.fn().mockResolvedValue({ start: 'now-15m', end: 'now' });

describe('KbnSuperDatePicker', () => {
  it('should render', async () => {
    renderWithI18n(<KbnSuperDatePicker onTimeChange={onTimeChangeMock} />);

    const superDatePicker = screen.getByTestId('kbnSuperDatePicker');
    expect(superDatePicker).toBeInTheDocument();
  });

  describe('props.getEntireTimeRange', () => {
    it('should render EntireTimeRangePanel when getEntireTimeRange is provided', async () => {
      renderWithI18n(
        <KbnSuperDatePicker
          onTimeChange={onTimeChangeMock}
          getEntireTimeRange={getEntireTimeRangeMock}
        />
      );

      await userEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));

      const entireTimeRangePanel = screen.getByText('Entire time range');
      expect(entireTimeRangePanel).toBeInTheDocument();
    });

    it('should not render EntireTimeRangePanel when getEntireTimeRange is not provided', async () => {
      renderWithI18n(<KbnSuperDatePicker onTimeChange={onTimeChangeMock} />);

      await userEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));

      const entireTimeRangePanel = screen.queryByText('Entire time range');
      expect(entireTimeRangePanel).not.toBeInTheDocument();
    });
  });
});
