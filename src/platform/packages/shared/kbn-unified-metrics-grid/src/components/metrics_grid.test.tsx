/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { MetricsGridProps } from './metrics_grid';
import { MetricsGrid } from './metrics_grid';
import { Chart } from './chart';
import { Subject } from 'rxjs';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';

jest.mock('./chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="chart" />),
}));

describe('MetricsGrid', () => {
  const requestParams: MetricsGridProps['requestParams'] = {
    filters: [],
    getTimeRange: () => ({ from: 'now-1h', to: 'now' }),
    query: {
      esql: 'FROM metrics-*',
    },
    relativeTimeRange: { from: 'now-1h', to: 'now' },
    updateTimeRange: () => {},
  };

  const services = {} as UnifiedHistogramServices;

  const fields: MetricsGridProps['fields'] = [
    {
      name: 'system.cpu.utilization',
      dimensions: [{ name: 'host.name', type: 'keyword' }],
      index: 'metrics-*',
      type: 'long',
    },
    {
      name: 'system.memory.utilization',
      dimensions: [{ name: 'host.name', type: 'keyword' }],
      index: 'metrics-*',
      type: 'long',
    },
  ];

  it('renders MetricChart for each metric field when pivotOn is metric', () => {
    const { getAllByTestId } = render(
      <MetricsGrid
        columns={3}
        dimensions={[]}
        pivotOn="metric"
        discoverFetch$={new Subject()}
        fields={fields}
        requestParams={requestParams}
        services={services}
        filters={[]}
      />
    );

    const charts = getAllByTestId('chart');
    expect(charts).toHaveLength(fields.length);
  });

  it('passes the correct size prop', () => {
    const { rerender } = render(
      <MetricsGrid
        columns={3}
        dimensions={['host.name']}
        pivotOn="metric"
        discoverFetch$={new Subject()}
        fields={fields}
        requestParams={requestParams}
        services={services}
        filters={[]}
      />
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 'm' }), expect.anything());

    rerender(
      <MetricsGrid
        columns={4}
        dimensions={['host.name']}
        pivotOn="metric"
        discoverFetch$={new Subject()}
        fields={fields}
        requestParams={requestParams}
        services={services}
        filters={[]}
      />
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 's' }), expect.anything());
  });
});
