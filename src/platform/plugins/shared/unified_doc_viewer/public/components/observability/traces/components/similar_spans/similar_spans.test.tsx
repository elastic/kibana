/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimilarSpans, type SimilarSpansProps } from '.';

jest.mock('../../../../content_framework/section', () => ({
  ContentFrameworkSection: ({ children, title, ...rest }: any) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));
jest.mock('../../../../content_framework/chart', () => ({
  ContentFrameworkChart: ({ children, title, ...rest }: any) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
}));
jest.mock('@kbn/apm-ui-shared', () => ({
  DurationDistributionChart: (props: any) => (
    <div data-test-subj="DurationDistributionChart">
      <span>Chart</span>
      <span>Loading: {String(props.loading)}</span>
      <span>HasError: {String(props.hasError)}</span>
      <span>DataLength: {props.data?.length ?? 0}</span>
      <span>MarkerValue: {props.markerValue}</span>
      <span>MarkerCurrentEvent: {props.markerCurrentEvent}</span>
    </div>
  ),
}));

const mockSpanDistributionChartData = [
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
    spanDuration: 1200,
    latencyChart: {
      data: {
        distributionChartData: mockSpanDistributionChartData,
        percentileThresholdValue: 1000,
      },
      loading: false,
      hasError: false,
    },
    isOtelSpan: true,
    esqlQuery: 'test',
  };

  it('renders the section and chart titles', () => {
    render(<SimilarSpans {...defaultProps} />);
    expect(screen.getByText('Similar spans')).toBeInTheDocument();
    expect(screen.getByText('Latency')).toBeInTheDocument();
  });

  it('renders DurationDistributionChart with correct props when data exists', () => {
    render(<SimilarSpans {...defaultProps} />);
    expect(screen.getByTestId('DurationDistributionChart')).toBeInTheDocument();
    expect(screen.getByText('Loading: false')).toBeInTheDocument();
    expect(screen.getByText('HasError: false')).toBeInTheDocument();
    expect(screen.getByText('DataLength: 1')).toBeInTheDocument();
    expect(screen.getByText('MarkerValue: 1000')).toBeInTheDocument();
    expect(screen.getByText('MarkerCurrentEvent: 1200')).toBeInTheDocument();
  });

  it('renders DurationDistributionChart in loading state', () => {
    render(
      <SimilarSpans
        {...defaultProps}
        latencyChart={{
          data: null,
          loading: true,
          hasError: false,
        }}
      />
    );
    expect(screen.getByTestId('DurationDistributionChart')).toBeInTheDocument();
    expect(screen.getByText('Loading: true')).toBeInTheDocument();
  });

  it('renders DurationDistributionChart with error', () => {
    render(
      <SimilarSpans
        {...defaultProps}
        latencyChart={{
          data: {
            distributionChartData: [],
          },
          loading: false,
          hasError: true,
        }}
      />
    );
    expect(screen.getByTestId('DurationDistributionChart')).toBeInTheDocument();
    expect(screen.getByText('HasError: true')).toBeInTheDocument();
  });
});
