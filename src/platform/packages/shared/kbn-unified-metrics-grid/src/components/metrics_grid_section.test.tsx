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
import { MetricsGridSection } from './metrics_grid_section';
import { queryByTestId } from '@testing-library/dom';
import '@testing-library/jest-dom';

const fields = [
  {
    name: 'cpu.usage',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    timeSeriesMetric: 'avg',
    unit: '%',
  },
  {
    name: 'memory.usage',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    timeSeriesMetric: 'avg',
    unit: 'MB',
  },
  {
    name: 'disk.io',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    timeSeriesMetric: 'avg',
    unit: 'IOPS',
  },
  {
    name: 'network.traffic',
    index: 'metrics-*',
    dimensions: [{ name: 'host.name', type: 'string' }],
    type: 'float',
    timeSeriesMetric: 'avg',
    unit: 'KB/s',
  },
];

const timeRange = { from: 'now-1h', to: 'now' };

describe('Discover metrics layout component', () => {
  it('should render MetricsGridSection', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection fields={fields} timeRange={timeRange} indexPattern={'metrics-*'} />
    );
    expect(await component.findByTestId('metrics-grid')).toBeInTheDocument();
  });

  it('should render all metric charts', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection fields={fields} timeRange={timeRange} indexPattern={'metrics-*'} />
    );
    for (const field of fields) {
      expect(await component.findByTestId(`metric-chart-${field.name}`)).toBeInTheDocument();
    }
  });

  it('should render header actions (explore and insights) for each metric chart by default', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection fields={fields} timeRange={timeRange} indexPattern="metrics-*" />
    );
    // The length is 4 because there are 4 metric charts rendered
    expect(await component.findAllByTestId('metricsChartExploreAction')).toHaveLength(4);
    expect(await component.findAllByTestId('metricsChartInsightsAction')).toHaveLength(4);
  });

  it('should render both actions when both are true', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection
        fields={fields}
        timeRange={timeRange}
        indexPattern="metrics-*"
        headerActions={{ hasExploreAction: true, hasMetricsInsightsAction: true }}
      />
    );
    expect(await component.findAllByTestId('metricsChartExploreAction')).toHaveLength(4);
    expect(await component.findAllByTestId('metricsChartInsightsAction')).toHaveLength(4);
  });

  it('should render only Explore action when only hasExploreAction is true', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection
        fields={fields}
        timeRange={timeRange}
        indexPattern="metrics-*"
        headerActions={{ hasExploreAction: true, hasMetricsInsightsAction: false }}
      />
    );
    expect(await component.findAllByTestId('metricsChartExploreAction')).toHaveLength(4);
    expect(queryByTestId(component.container, 'metricsChartInsightsAction')).toBeNull();
  });

  it('should render only Insights action when only hasMetricsInsightsAction is true', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection
        fields={fields}
        timeRange={timeRange}
        indexPattern="metrics-*"
        headerActions={{ hasExploreAction: false, hasMetricsInsightsAction: true }}
      />
    );
    expect(queryByTestId(component.container, 'metricsChartExploreAction')).toBeNull();
    expect(await component.findAllByTestId('metricsChartInsightsAction')).toHaveLength(4);
  });

  it('should render neither action when both are false', async () => {
    const component = renderWithKibanaRenderContext(
      <MetricsGridSection
        fields={fields}
        timeRange={timeRange}
        indexPattern="metrics-*"
        headerActions={{ hasExploreAction: false, hasMetricsInsightsAction: false }}
      />
    );
    expect(queryByTestId(component.container, 'metricsChartExploreAction')).toBeNull();
    expect(queryByTestId(component.container, 'metricsChartInsightsAction')).toBeNull();
  });
});
