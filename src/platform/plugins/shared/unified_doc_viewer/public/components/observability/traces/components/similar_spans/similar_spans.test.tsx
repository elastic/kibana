/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimilarSpans, type SimilarSpansProps } from '.';

vi.mock('../../../../content_framework/lazy_content_framework_section', () => {
      const mocked = {
      ContentFrameworkSection: ({ children, title, ...rest }: any) => (
        <div data-test-subj="ContentFrameworkSection" {...rest}>
          <h2>{title}</h2>
          {children}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../content_framework/chart', () => {
      const mocked = {
      ContentFrameworkChart: ({ children, title, ...rest }: any) => (
        <div data-test-subj="ContentFrameworkChart" {...rest}>
          <span>{title}</span>
          {children}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../hooks/use_data_sources', () => {
      const mocked = {
      useDataSourcesContext: () => ({
        indexes: { apm: { traces: 'test-index' } },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../plugin', () => {
      const mocked = {
      getUnifiedDocViewerServices: () => ({
        data: {
          query: {
            timefilter: {
              timefilter: {
                getAbsoluteTime: vi.fn(() => ({ from: 'now-15m', to: 'now' })),
              },
            },
          },
        },
        share: {
          url: {
            locators: {
              get: vi.fn(() => ({
                getRedirectUrl: vi.fn(() => 'http://discover-url'),
              })),
            },
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_latency_chart', () => {
      const mocked = {
      useLatencyChart: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

import { useLatencyChart } from '../../hooks/use_latency_chart';

const mockChartData = [
  {
    id: 'All spans',
    histogram: [
      { key: 100, doc_count: 2 },
      { key: 500, doc_count: 5 },
      { key: 1200, doc_count: 1 },
    ],
    areaSeriesColor: '#54B399',
  },
];

describe('SimilarSpans', () => {
  const defaultProps: SimilarSpansProps = {
    duration: 1200,
    spanName: 'mySpan',
    serviceName: 'orders-service',
    transactionName: 'txn-001',
    transactionType: 'request',
    isOtelSpan: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section and chart titles', () => {
    (useLatencyChart as Mock).mockReturnValue({
      data: {
        distributionChartData: mockChartData,
        percentileThresholdValue: 1000,
      },
      loading: false,
      hasError: false,
    });

    render(<SimilarSpans {...defaultProps} />);
    expect(screen.getByTestId('docViewerSimilarSpansSection')).toBeInTheDocument();
    expect(screen.getByText('Similar spans')).toBeInTheDocument();
    expect(screen.getByTestId('docViewerSimilarSpansLatencyChart')).toBeInTheDocument();
    expect(screen.getByText('Latency')).toBeInTheDocument();
  });

  it('renders DurationDistributionChart', () => {
    (useLatencyChart as Mock).mockReturnValue({
      data: {
        distributionChartData: mockChartData,
        percentileThresholdValue: 1000,
      },
      loading: false,
      hasError: false,
    });

    render(<SimilarSpans {...defaultProps} />);
    const chart = screen.getByTestId('docViewerSimilarSpansDurationDistributionChart');
    expect(chart).toBeInTheDocument();
  });

  it('renders DurationDistributionChart in loading state', () => {
    (useLatencyChart as Mock).mockReturnValue({
      data: null,
      loading: true,
      hasError: false,
    });

    render(<SimilarSpans {...defaultProps} />);
    const chart = screen.getByTestId('docViewerSimilarSpansDurationDistributionChart');
    expect(chart).toBeInTheDocument();
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders DurationDistributionChart with error', () => {
    (useLatencyChart as Mock).mockReturnValue({
      data: {
        distributionChartData: [],
        percentileThresholdValue: undefined,
      },
      loading: false,
      hasError: true,
    });

    render(<SimilarSpans {...defaultProps} />);
    expect(
      screen.getByText('An error happened when trying to fetch data. Please try again')
    ).toBeInTheDocument();
  });
});
