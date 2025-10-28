/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MetricsGridProps } from './metrics_grid';
import { MetricsGrid } from './metrics_grid';
import { Chart } from './chart';
import { BehaviorSubject } from 'rxjs';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import type { UnifiedHistogramFetchMessage } from '@kbn/unified-histogram/types';

jest.mock('./chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="chart" />),
}));

describe('MetricsGrid', () => {
  let discoverFetch$: BehaviorSubject<UnifiedHistogramFetchMessage>;

  beforeEach(() => {
    jest.clearAllMocks();
    discoverFetch$ = new BehaviorSubject({ type: 'fetch' });
  });

  afterEach(() => {
    discoverFetch$.complete();
  });

  const requestParams: MetricsGridProps['requestParams'] = {
    filters: [],
    getTimeRange: () => ({ from: 'now-1h', to: 'now' }),
    query: {
      esql: 'FROM metrics-*',
    },
    esqlVariables: [],
    relativeTimeRange: { from: 'now-1h', to: 'now' },
    updateTimeRange: () => {},
  };

  const services = {
    fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
  } as unknown as UnifiedHistogramServices;

  const fields: MetricsGridProps['fields'] = [
    {
      name: 'system.cpu.utilization',
      dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
      index: 'metrics-*',
      type: 'long',
    },
    {
      name: 'system.memory.utilization',
      dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
      index: 'metrics-*',
      type: 'long',
    },
  ];

  it('renders MetricChart for each metric field when pivotOn is metric', () => {
    const { getAllByTestId } = render(
      <MetricsGrid
        columns={3}
        dimensions={[]}
        discoverFetch$={discoverFetch$}
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
        discoverFetch$={discoverFetch$}
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
        discoverFetch$={discoverFetch$}
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
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders with proper ARIA grid attributes', () => {
      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          discoverFetch$={discoverFetch$}
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
          discoverFetch$={discoverFetch$}
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
      const user = userEvent.setup({ delay: null });

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          discoverFetch$={discoverFetch$}
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
      const user = userEvent.setup({ delay: null });

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          discoverFetch$={discoverFetch$}
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
      const user = userEvent.setup({ delay: null });
      const multipleFields = [
        ...fields,
        {
          name: 'system.disk.utilization',
          dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
          index: 'metrics-*',
          type: 'long',
        },
        {
          name: 'system.network.utilization',
          dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
          index: 'metrics-*',
          type: 'long',
        },
      ];

      render(
        <MetricsGrid
          columns={2}
          dimensions={[]}
          discoverFetch$={discoverFetch$}
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

  describe('MetricsGrid focus management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock setTimeout to run synchronously in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('Chart ref management', () => {
      it('should generate unique chart IDs for each metric', () => {
        render(
          <MetricsGrid
            columns={2}
            dimensions={[]}
            discoverFetch$={discoverFetch$}
            fields={fields}
            requestParams={requestParams}
            services={services}
            filters={[]}
          />
        );

        const chartDiv1 = document.getElementById('system.cpu.utilization-0');
        const chartDiv2 = document.getElementById('system.memory.utilization-1');

        expect(chartDiv1).toBeTruthy();
        expect(chartDiv2).toBeTruthy();
      });

      it('should store chart refs with proper data attributes', () => {
        render(
          <MetricsGrid
            columns={2}
            dimensions={[]}
            discoverFetch$={discoverFetch$}
            fields={fields}
            requestParams={requestParams}
            services={services}
            filters={[]}
          />
        );

        const gridCells = screen.getAllByRole('gridcell');

        // Verify grid cells have proper tracking attributes
        expect(gridCells[0]).toHaveAttribute('data-grid-cell', '0-0');
        expect(gridCells[1]).toHaveAttribute('data-grid-cell', '0-1');
      });
    });

    describe('Focus state management', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should update focus state when cell receives focus', async () => {
        const user = userEvent.setup({ delay: null });

        render(
          <MetricsGrid
            columns={2}
            dimensions={[]}
            discoverFetch$={discoverFetch$}
            fields={fields}
            requestParams={requestParams}
            services={services}
            filters={[]}
          />
        );

        const gridCells = screen.getAllByRole('gridcell');

        // Focus the second cell
        await user.click(gridCells[1]);

        // Verify focus state updated correctly
        expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
        expect(gridCells[1]).toHaveAttribute('tabindex', '0');
      });

      it('should handle programmatic focus correctly', () => {
        render(
          <MetricsGrid
            columns={2}
            dimensions={[]}
            discoverFetch$={discoverFetch$}
            fields={fields}
            requestParams={requestParams}
            services={services}
            filters={[]}
          />
        );

        const gridCells = screen.getAllByRole('gridcell');

        // Simulate programmatic focus (like from flyout closing)
        act(() => gridCells[1].focus());
        act(() => fireEvent.focus(gridCells[1]));

        // Verify focus state and DOM focus
        expect(document.activeElement).toBe(gridCells[1]);
        expect(gridCells[1]).toHaveAttribute('tabindex', '0');
        expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
