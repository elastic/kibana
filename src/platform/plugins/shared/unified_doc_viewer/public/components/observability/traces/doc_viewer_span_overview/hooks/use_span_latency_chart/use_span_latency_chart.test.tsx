/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSpanLatencyChart } from '.';
import { getUnifiedDocViewerServices } from '../../../../../../plugin';
import { EuiThemeComputed } from '@elastic/eui';

jest.mock('../../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const mockHttpPost = jest.fn();
const mockAddDanger = jest.fn();
const mockTimefilter = {
  getAbsoluteTime: () => ({
    from: '2023-01-01T00:00:00.000Z',
    to: '2023-01-01T01:00:00.000Z',
  }),
};

const mockTheme: EuiThemeComputed = {
  colors: {
    vis: {
      euiColorVis1: 'euiColorVis1',
    },
  },
} as EuiThemeComputed;

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  core: {
    http: {
      post: mockHttpPost,
    },
    notifications: {
      toasts: {
        addDanger: mockAddDanger,
      },
    },
  },
  data: {
    query: {
      timefilter: {
        timefilter: mockTimefilter,
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSpanLatencyChart', () => {
  const params = {
    spanName: 'test-span',
    serviceName: 'test-service',
  };

  describe('when parameters are NOT missing', () => {
    it('should fetch and set data successfully', async () => {
      mockHttpPost.mockResolvedValue({
        overallHistogram: [{ x: 1, y: 2 }],
        percentileThresholdValue: 456,
      });

      const { result } = renderHook(() => useSpanLatencyChart(params));

      await waitFor(() => !result.current.loading);

      expect(result.current.loading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.spanDistributionChartData).toHaveLength(1);
      expect(result.current.data?.percentileThresholdValue).toBe(456);
    });
  });

  describe('when parameters are missing', () => {
    it('should return null data and stop loading', async () => {
      const { result } = renderHook(() =>
        useSpanLatencyChart({
          spanName: '',
          serviceName: '',
        })
      );

      await waitFor(() => !result.current.loading);

      expect(result.current.loading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('when there is an error', () => {
    it('should handle error and show toast', async () => {
      mockHttpPost.mockRejectedValue(new Error('Fetch error'));

      const { result } = renderHook(() => useSpanLatencyChart(params));

      await waitFor(() => !result.current.loading);

      expect(result.current.loading).toBe(false);
      expect(result.current.hasError).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'An error occurred while fetching the latency histogram',
          text: 'Fetch error',
        })
      );
    });
  });
});
