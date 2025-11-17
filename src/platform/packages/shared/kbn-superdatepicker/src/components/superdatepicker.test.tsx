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

describe('KbnSuperDatePicker', () => {
  it('should render', async () => {
    renderWithI18n(<KbnSuperDatePicker onTimeChange={onTimeChangeMock} />);

    const superDatePicker = screen.getByTestId('kbnSuperDatePicker');
    expect(superDatePicker).toBeInTheDocument();
  });

  describe('props.enableEntireTimeRange', () => {
    it('should render EntireTimeRangePanel when true', async () => {
      renderWithI18n(
        <KbnSuperDatePicker onTimeChange={onTimeChangeMock} enableEntireTimeRange={true} />
      );

      await userEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));

      const entireTimeRangePanel = screen.getByText('Entire time range');
      expect(entireTimeRangePanel).toBeInTheDocument();
    });

    it('should not render EntireTimeRangePanel when falsy', async () => {
      renderWithI18n(
        <KbnSuperDatePicker onTimeChange={onTimeChangeMock} enableEntireTimeRange={false} />
      );

      await userEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));

      const entireTimeRangePanel = screen.queryByText('Entire time range');
      expect(entireTimeRangePanel).not.toBeInTheDocument();
    });
  });
});
