/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { apm } from '@elastic/apm-rum';
import type { EuiThemeComputed } from '@elastic/eui';
import { useLatencyChart } from '.';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const mockFetchSpanDistribution = jest.fn();
const mockAdd = jest.fn();
const mockAddDanger = jest.fn();

const mockTheme: EuiThemeComputed = {
  colors: {
    vis: {
      euiColorVis1: 'euiColorVis1',
    },
  },
} as EuiThemeComputed;

const mockGetById = jest.fn((id: string) => {
  if (id === 'observability-traces-fetch-latency-overall-span-distribution') {
    return { fetchLatencyOverallSpanDistribution: mockFetchSpanDistribution };
  }
  return undefined;
});

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  core: {
    notifications: {
      toasts: {
        add: mockAdd,
        addDanger: mockAddDanger,
      },
    },
  },
  data: {
    query: {
      timefilter: {
        timefilter: {
          getAbsoluteTime: () => ({
            from: '2023-01-01T00:00:00.000Z',
            to: '2023-01-01T01:00:00.000Z',
          }),
        },
      },
    },
  },
  discoverShared: {
    features: {
      registry: {
        getById: mockGetById,
      },
    },
  },
});

jest.mock('@elastic/eui', () => {
  const originalModule = jest.requireActual('@elastic/eui');
  return {
    ...originalModule,
    useEuiTheme: () => ({ euiTheme: mockTheme }),
  };
});

describe('useLatencyChart', () => {
  const params = {
    spanName: 'test-span',
    serviceName: 'test-service',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and sets data successfully', async () => {
    mockFetchSpanDistribution.mockResolvedValue({
      overallHistogram: [{ x: 1, y: 2 }],
      percentileThresholdValue: 456,
    });

    const { result } = renderHook(() => useLatencyChart(params));

    await waitFor(() => !result.current.loading);

    expect(result.current.hasError).toBe(false);
    expect(result.current.data?.distributionChartData).toHaveLength(1);
    expect(result.current.data?.percentileThresholdValue).toBe(456);
  });

  it('captures a single APM event with the operation id label and shows a non-capturing danger toast on error', async () => {
    const error = new Error('Fetch error');
    mockFetchSpanDistribution.mockRejectedValue(error);

    const { result } = renderHook(() => useLatencyChart(params));

    await waitFor(() => !result.current.loading);

    expect(result.current.hasError).toBe(true);

    await waitFor(() => {
      expect(apm.captureError).toHaveBeenCalledWith(error, {
        labels: { kibana_meta_operation_id: 'fetch-latency-overall-distribution' },
      });
    });

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'danger',
        iconType: 'error',
        title: 'An error occurred while fetching the latency histogram',
        text: 'Fetch error',
      })
    );
    expect(mockAddDanger).not.toHaveBeenCalled();
  });
});
