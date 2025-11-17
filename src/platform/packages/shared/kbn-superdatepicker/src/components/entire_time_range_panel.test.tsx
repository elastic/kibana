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
import { getTimeFieldRange } from '../services/time_field_range';
import type { DataView } from '@kbn/data-views-plugin/public';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

jest.mock('../services/time_field_range');

const mockGetTimeFieldRange = getTimeFieldRange as jest.MockedFunction<typeof getTimeFieldRange>;
const onTimeChangeMock = jest.fn();
const mockHttp = httpServiceMock.createStartContract();
const mockDataView = {
  getIndexPattern: jest.fn().mockReturnValue('test-index-*'),
  timeFieldName: '@timestamp',
  getRuntimeMappings: jest.fn().mockReturnValue({}),
} as unknown as DataView;

describe('EntireTimeRangePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the link with correct text', () => {
    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        http={mockHttp}
        dataView={mockDataView}
      />
    );

    expect(screen.getByText('Entire time range')).toBeInTheDocument();
  });

  it('should call getTimeFieldRange with correct parameters when clicked', async () => {
    const mockQuery = { match_all: {} };
    mockGetTimeFieldRange.mockResolvedValue({
      success: true,
      start: { epoch: 1000, string: 'now-7d' },
      end: { epoch: 2000, string: 'now' },
    });

    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        http={mockHttp}
        dataView={mockDataView}
        query={mockQuery}
      />
    );

    await userEvent.click(screen.getByText('Entire time range'));

    await waitFor(() => {
      expect(mockGetTimeFieldRange).toHaveBeenCalledWith({
        index: 'test-index-*',
        timeFieldName: '@timestamp',
        query: mockQuery,
        http: mockHttp,
      });
    });
  });

  it('should call onTimeChange with correct parameters on successful response', async () => {
    mockGetTimeFieldRange.mockResolvedValue({
      success: true,
      start: { epoch: 1000, string: 'now-30d' },
      end: { epoch: 2000, string: 'now' },
    });

    renderWithI18n(
      <EntireTimeRangePanel
        onTimeChange={onTimeChangeMock}
        http={mockHttp}
        dataView={mockDataView}
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
