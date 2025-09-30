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
import userEvent from '@testing-library/user-event';
import type { MetricsGridProps } from './metrics_grid';
import { MetricsGrid } from './metrics_grid';
import { Chart } from './chart';
import { Subject } from 'rxjs';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';

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

  const services = {
    fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
  } as unknown as UnifiedHistogramServices;

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

  describe('MetricsGrid keyboard navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders with proper ARIA grid attributes', () => {
      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          pivotOn="metric"
          discoverFetch$={new Subject()}
          fields={fields}
          requestParams={requestParams}
          services={services}
          filters={[]}
        />
      );

      const gridElement = screen.getByRole('grid');
      expect(gridElement).toBeInTheDocument();
      expect(gridElement).toHaveAttribute('aria-rowcount', '1'); // 2 fields, 2 columns = 1 row
      expect(gridElement).toHaveAttribute('aria-colcount', '2');
      expect(gridElement).toHaveAttribute('tabindex', '0');
      expect(gridElement).toHaveAttribute(
        'aria-label',
        'Metric charts grid. Use arrow keys to navigate.'
      );
    });

    it('renders grid cells with proper ARIA attributes', () => {
      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          pivotOn="metric"
          discoverFetch$={new Subject()}
          fields={fields}
          requestParams={requestParams}
          services={services}
          filters={[]}
        />
      );

      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells).toHaveLength(2);

      // First cell should be focusable initially (default focus position)
      expect(gridCells[0]).toHaveAttribute('tabindex', '0');
      expect(gridCells[0]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[0]).toHaveAttribute('aria-colindex', '1');

      // Second cell should not be focusable initially
      expect(gridCells[1]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[1]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[1]).toHaveAttribute('aria-colindex', '2');
    });

    it('should handle arrow key navigation correctly', async () => {
      const user = userEvent.setup();

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          pivotOn="metric"
          discoverFetch$={new Subject()}
          fields={fields}
          requestParams={requestParams}
          services={services}
          filters={[]}
        />
      );

      const gridElement = screen.getByRole('grid');
      const gridCells = screen.getAllByRole('gridcell');

      await user.click(gridElement);
      await user.keyboard('{ArrowRight}');

      // Second cell should be focused
      expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[1]).toHaveAttribute('tabindex', '0');

      await user.keyboard('{ArrowLeft}');

      // First cell should be focused again
      expect(gridCells[0]).toHaveAttribute('tabindex', '0');
      expect(gridCells[1]).toHaveAttribute('tabindex', '-1');
    });

    it('should handle clicking on cells to focus them', async () => {
      const user = userEvent.setup();

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          pivotOn="metric"
          discoverFetch$={new Subject()}
          fields={fields}
          requestParams={requestParams}
          services={services}
          filters={[]}
        />
      );

      const gridCells = screen.getAllByRole('gridcell');

      await user.click(gridCells[1]);

      // Second cell should be focused
      expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[1]).toHaveAttribute('tabindex', '0');
    });

    it('should handle vertical arrow navigation in multi-row grid', async () => {
      const user = userEvent.setup();
      const multipleFields = [
        ...fields,
        {
          name: 'system.disk.utilization',
          dimensions: [{ name: 'host.name', type: 'keyword' }],
          index: 'metrics-*',
          type: 'long',
        },
        {
          name: 'system.network.utilization',
          dimensions: [{ name: 'host.name', type: 'keyword' }],
          index: 'metrics-*',
          type: 'long',
        },
      ];

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          pivotOn="metric"
          discoverFetch$={new Subject()}
          fields={multipleFields}
          requestParams={requestParams}
          services={services}
          filters={[]}
        />
      );

      const gridElement = screen.getByRole('grid');
      const gridCells = screen.getAllByRole('gridcell');

      await user.click(gridElement);

      // Initially at cell 0 (row 0, col 0)
      expect(gridCells[0]).toHaveAttribute('tabindex', '0');

      await user.keyboard('{ArrowDown}');
      expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[2]).toHaveAttribute('tabindex', '0');

      await user.keyboard('{ArrowUp}');
      expect(gridCells[2]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[0]).toHaveAttribute('tabindex', '0');
    });
  });
});
