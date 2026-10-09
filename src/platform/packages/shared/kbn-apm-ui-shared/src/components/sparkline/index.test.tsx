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
import { useEuiTheme } from '@elastic/eui';
import { Sparkline } from '.';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-chart">{children}</div>
  ),
  LineSeries: () => null,
  AreaSeries: () => null,
  BarSeries: () => null,
  Settings: () => null,
  Tooltip: () => null,
  ScaleType: { Linear: 'linear', Time: 'time' },
  CurveType: { CURVE_MONOTONE_X: 'monotoneX' },
}));

jest.mock('../../hooks/use_chart_theme', () => ({
  useChartThemes: () => ({ theme: [], baseTheme: {} }),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
  EuiLoadingChart: () => <div data-test-subj="loading-chart" />,
  EuiIcon: ({ type }: { type: string }) => <div data-test-subj={`icon-${type}`} />,
}));

const color = '#000';
const validSeries = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 3 },
];
const allNullSeries = [
  { x: 0, y: null },
  { x: 1, y: null },
];

describe('Sparkline', () => {
  beforeEach(() => {
    (useEuiTheme as jest.Mock).mockReturnValue({
      euiTheme: { colors: { mediumShade: '#ccc' } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading indicator when isLoading is true', () => {
    render(<Sparkline color={color} isLoading={true} />);
    expect(screen.getByTestId('loading-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-chartLine')).not.toBeInTheDocument();
  });

  it('renders a no-data icon when series is null', () => {
    render(<Sparkline color={color} series={null} />);
    expect(screen.getByTestId('icon-chartLine')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('renders a no-data icon when all y values are null', () => {
    render(<Sparkline color={color} series={allNullSeries} />);
    expect(screen.getByTestId('icon-chartLine')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('renders a chart when series has valid data', () => {
    render(<Sparkline color={color} series={validSeries} />);
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-chartLine')).not.toBeInTheDocument();
  });
});
