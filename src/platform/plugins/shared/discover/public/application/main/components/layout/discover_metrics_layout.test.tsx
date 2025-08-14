/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { DiscoverMetricsLayout } from './discover_metrics_layout';

const fields = [
  {
    name: 'cpu.usage',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    time_series_metric: 'avg',
    unit: '%',
  },
  {
    name: 'memory.usage',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    time_series_metric: 'avg',
    unit: 'MB',
  },
  {
    name: 'disk.io',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    time_series_metric: 'avg',
    unit: 'IOPS',
  },
  {
    name: 'network.traffic',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    time_series_metric: 'avg',
    unit: 'KB/s',
  },
];

const timeRange = { from: 'now-1h', to: 'now' };

describe('Discover metrics layout component', () => {
  it('should render MetricsGridSection', async () => {
    const component = renderWithKibanaRenderContext(
      <DiscoverMetricsLayout fields={fields} timeRange={timeRange} indexPattern={'metrics-*'} />
    );
    expect(await component.findByTestId('metrics-grid')).toBeInTheDocument();
  });

  it('should render all metric charts', async () => {
    const component = renderWithKibanaRenderContext(
      <DiscoverMetricsLayout fields={fields} timeRange={timeRange} indexPattern={'metrics-*'} />
    );
    for (const field of fields) {
      expect(await component.findByTestId(`metric-chart-${field.name}`)).toBeInTheDocument();
    }
  });
});
