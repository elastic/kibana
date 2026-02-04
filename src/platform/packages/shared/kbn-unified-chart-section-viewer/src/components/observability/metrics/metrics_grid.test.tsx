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
import { Chart } from '../../chart';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import { getFetchParamsMock, getFetch$Mock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import type { UnifiedHistogramFetch$ } from '@kbn/unified-histogram/types';
import type { UnifiedMetricsGridProps } from '../../../types';
import { createESQLQuery } from '../../../common/utils';

jest.mock('../../chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="chart" />),
}));

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createESQLQuery: jest.fn((params) => {
    const { metric, splitAccessors = [] } = params;
    const splitAccessorsStr =
      splitAccessors.length > 0
        ? `, ${splitAccessors.map((field: string) => `\`${field}\``).join(', ')}`
        : '';
    return `FROM ${metric.index} | STATS AVG(${metric.name}) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)${splitAccessorsStr}`;
  }),
}));

describe('MetricsGrid', () => {
  let discoverFetch$: UnifiedHistogramFetch$;

  const actions: UnifiedMetricsGridProps['actions'] = {
    openInNewTab: jest.fn(),
    updateESQLQuery: jest.fn(),
  };

  const fetchParams: MetricsGridProps['fetchParams'] = getFetchParamsMock({
    filters: [],
    query: {
      esql: 'FROM metrics-*',
    },
    esqlVariables: [],
    relativeTimeRange: { from: 'now-1h', to: 'now' },
  });

  const services = {
    fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
  } as unknown as UnifiedHistogramServices;

  const fields: MetricsGridProps['fields'] = [
    {
      name: 'system.cpu.utilization',
      dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
      index: 'metrics-*',
      type: ES_FIELD_TYPES.LONG,
    },
    {
      name: 'system.memory.utilization',
      dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
      index: 'metrics-*',
      type: ES_FIELD_TYPES.LONG,
    },
  ];

  const defaultProps: MetricsGridProps = {
    columns: 2,
    dimensions: [],
    discoverFetch$: undefined as unknown as UnifiedHistogramFetch$,
    fields,
    fetchParams,
    services,
    actions,
  };

  const renderMetricsGrid = (props: Partial<MetricsGridProps> = {}) => {
    return render(<MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    discoverFetch$ = getFetch$Mock(fetchParams);
  });

  afterEach(() => {
    discoverFetch$.complete();
  });

  it('renders MetricChart for each metric field when pivotOn is metric', () => {
    const { getAllByTestId } = renderMetricsGrid({ columns: 3 });

    const charts = getAllByTestId('chart');
    expect(charts).toHaveLength(fields.length);
  });

  it('passes the correct size prop', () => {
    const { rerender } = render(
      <MetricsGrid
        {...defaultProps}
        columns={3}
        dimensions={[{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }]}
        discoverFetch$={discoverFetch$}
      />
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 's' }), expect.anything());

    rerender(
      <MetricsGrid
        {...defaultProps}
        columns={4}
        dimensions={[{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }]}
        discoverFetch$={discoverFetch$}
      />
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 's' }), expect.anything());
  });

  it('handles multiple dimensions correctly in ESQL query and chart layers', () => {
    const multipleDimensions = [
      { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
      { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
      { name: 'container.id', type: ES_FIELD_TYPES.KEYWORD },
    ];

    renderMetricsGrid({ dimensions: multipleDimensions });

    expect(createESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: expect.any(Object),
        splitAccessors: ['host.name', 'service.name', 'container.id'],
      })
    );

    expect(Chart).toHaveBeenCalledWith(
      expect.objectContaining({
        chartLayers: expect.arrayContaining([
          expect.objectContaining({
            breakdown: 'host.name',
          }),
        ]),
      }),
      expect.anything()
    );
  });

  describe('MetricsGrid keyboard navigation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders with proper ARIA grid attributes', () => {
      renderMetricsGrid();

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
      renderMetricsGrid();

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

      renderMetricsGrid();

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

      renderMetricsGrid();

      const gridCells = screen.getAllByRole('gridcell');

      await user.click(gridCells[1]);

      // Second cell should be focused
      expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
      expect(gridCells[1]).toHaveAttribute('tabindex', '0');
    });

    it('should handle vertical arrow navigation in multi-row grid', async () => {
      const user = userEvent.setup({ delay: null });
      const multipleFields: MetricsGridProps['fields'] = [
        ...fields,
        {
          name: 'system.disk.utilization',
          dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
          index: 'metrics-*',
          type: ES_FIELD_TYPES.LONG,
        },
        {
          name: 'system.network.utilization',
          dimensions: [{ name: 'host.name', type: ES_FIELD_TYPES.KEYWORD }],
          index: 'metrics-*',
          type: ES_FIELD_TYPES.LONG,
        },
      ];

      renderMetricsGrid({ fields: multipleFields });

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
        renderMetricsGrid();

        const chartDiv1 = document.getElementById('system.cpu.utilization-0');
        const chartDiv2 = document.getElementById('system.memory.utilization-1');

        expect(chartDiv1).toBeTruthy();
        expect(chartDiv2).toBeTruthy();
      });

      it('should store chart refs with proper data attributes', () => {
        renderMetricsGrid();

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

        renderMetricsGrid();

        const gridCells = screen.getAllByRole('gridcell');

        // Focus the second cell
        await user.click(gridCells[1]);

        // Verify focus state updated correctly
        expect(gridCells[0]).toHaveAttribute('tabindex', '-1');
        expect(gridCells[1]).toHaveAttribute('tabindex', '0');
      });

      it('should handle programmatic focus correctly', () => {
        renderMetricsGrid();

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
