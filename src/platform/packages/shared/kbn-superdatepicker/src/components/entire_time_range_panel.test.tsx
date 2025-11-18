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
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntireTimeRangePanel } from './entire_time_range_panel';

const onTimeChangeMock = jest.fn();
const mockGetTimeFieldRange = jest.fn();

describe('EntireTimeRangePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the link with correct text', () => {
    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={mockGetTimeFieldRange}
      />
    );

    expect(screen.getByText('Entire time range')).toBeInTheDocument();
  });

  it('should call onTimeChange with correct parameters on successful response', async () => {
    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={mockGetTimeFieldRange.mockResolvedValue({
          start: 'now-30d',
          end: 'now',
        })}
      />
    );

    await userEvent.click(screen.getByText('Entire time range'));

    await waitFor(() => {
      expect(onTimeChangeMock).toHaveBeenCalledWith({
        start: 'now-30d',
        end: 'now',
        isInvalid: false,
        isQuickSelection: true,
      });
    });
  });
});
