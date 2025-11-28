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
const abortErrorMock = new DOMException('Aborted', 'AbortError');

const getEntireTimeRangeMock = jest.fn();

const getEntireTimeRangeWithAbortMock = jest.fn((signal?: AbortSignal) => {
  return new Promise<{ start: string; end: string }>((_, reject) => {
    if (signal?.aborted) return reject(abortErrorMock);

    const onAbort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(abortErrorMock);
    };

    signal?.addEventListener('abort', onAbort);
  });
});

describe('EntireTimeRangePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render the button with correct text', () => {
    const mockGetTimeFieldRange = jest.fn();

    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={mockGetTimeFieldRange}
      />
    );

    const entireTimeRangeButton = screen.getByText('Entire time range');

    expect(entireTimeRangeButton).toBeInTheDocument();
  });

  it('should call onTimeChange with correct parameters on successful response', async () => {
    getEntireTimeRangeMock.mockResolvedValue({ start: 'now-30d', end: 'now' });

    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={getEntireTimeRangeMock}
      />
    );

    const entireTimeRangeButton = screen.getByText('Entire time range');

    await userEvent.click(entireTimeRangeButton);

    await waitFor(() => {
      expect(onTimeChangeMock).toHaveBeenCalledWith({
        start: 'now-30d',
        end: 'now',
        isInvalid: false,
        isQuickSelection: true,
      });
    });
  });

  it('should abort request when cancel button is clicked', async () => {
    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={getEntireTimeRangeWithAbortMock}
      />
    );

    const entireTimeRangeButton = screen.getByText('Entire time range');

    await userEvent.click(entireTimeRangeButton);

    const cancelRequestButton = screen.getByLabelText('Cancel request');

    await waitFor(() => {
      expect(cancelRequestButton).toBeInTheDocument();
    });

    await userEvent.click(cancelRequestButton);

    await waitFor(() => {
      expect(screen.queryByTestId('euiLoadingSpinner')).not.toBeInTheDocument();
      expect(onTimeChangeMock).not.toHaveBeenCalled();
    });
  });

  it('should abort request when component unmounts', async () => {
    const { unmount } = renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        getEntireTimeRange={getEntireTimeRangeWithAbortMock}
      />
    );

    const entireTimeRangeButton = screen.getByText('Entire time range');

    await userEvent.click(entireTimeRangeButton);

    await waitFor(() => {
      expect(entireTimeRangeButton).toHaveAttribute('disabled');
    });

    unmount();

    expect(onTimeChangeMock).not.toHaveBeenCalled();
  });
});
