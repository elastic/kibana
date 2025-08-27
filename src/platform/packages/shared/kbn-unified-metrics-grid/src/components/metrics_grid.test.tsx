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
import type { MetricsGridProps } from './metrics_grid';
import { MetricsGrid } from './metrics_grid';
import { MetricChart } from './metric_chart';

jest.mock('./metric_chart', () => ({
  MetricChart: jest.fn(() => <div data-test-subj="metric-chart" />),
}));

describe('MetricsGrid', () => {
  const timeRange: MetricsGridProps['timeRange'] = { from: 'now-1h', to: 'now' };
  const fields: MetricsGridProps['fields'] = [
    {
      name: 'system.cpu.utilization',
      dimensions: [{ name: 'host.name', type: 'keyword' }],
      index: 'metrics-*',
      type: 'number',
    },
    {
      name: 'system.memory.utilization',
      dimensions: [{ name: 'host.name', type: 'keyword' }],
      index: 'metrics-*',
      type: 'number',
    },
  ];

  it('renders loading state when loading is true', () => {
    render(
      <MetricsGrid
        loading={true}
        fields={[]}
        dimensions={[]}
        pivotOn="metric"
        columns={3}
        timeRange={timeRange}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders "No results found" when pivotOn is metric and fields are empty', () => {
    const { getByText } = render(
      <MetricsGrid
        loading={false}
        fields={[]}
        dimensions={[]}
        pivotOn="metric"
        columns={3}
        timeRange={timeRange}
      />
    );

    expect(getByText('No results found')).toBeInTheDocument();
  });

  it('renders MetricChart for each metric field when pivotOn is metric', () => {
    const { getAllByTestId } = render(
      <MetricsGrid
        loading={false}
        fields={fields}
        dimensions={['host.name']}
        pivotOn="metric"
        columns={2}
        timeRange={timeRange}
      />
    );

    const charts = getAllByTestId('metric-chart');
    expect(charts).toHaveLength(fields.length);
  });

  it('passes the correct size prop', () => {
    const { rerender } = render(
      <MetricsGrid
        loading={false}
        fields={fields}
        dimensions={['host.name']}
        pivotOn="metric"
        columns={3}
        timeRange={timeRange}
        filters={[]}
      />
    );

    // For columns=3 → size should be "m"
    expect(MetricChart).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'm' }),
      expect.anything()
    );

    rerender(
      <MetricsGrid
        loading={false}
        fields={fields}
        dimensions={['host.name']}
        pivotOn="metric"
        columns={4}
        timeRange={timeRange}
        filters={[]}
      />
    );

    // For columns=4 → size should be "s"
    expect(MetricChart).toHaveBeenCalledWith(
      expect.objectContaining({ size: 's' }),
      expect.anything()
    );
  });
});
