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
import { dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { MetricsExperienceStateProvider } from './context/metrics_experience_state_provider';

jest.mock('@kbn/discover-utils', () => ({
  DiscoverFlyouts: { metricInsights: 'metricInsights' },
  dismissAllFlyoutsExceptFor: jest.fn(),
}));

jest.mock('../../chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="chart" />),
}));

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createESQLQuery: jest.fn((params) => {
    const { metricItem, splitAccessors = [] } = params;
    const splitAccessorsStr =
      splitAccessors.length > 0
        ? `, ${splitAccessors.map((field: string) => `\`${field}\``).join(', ')}`
        : '';
    return `FROM ${metricItem.dataStream} | STATS AVG(${metricItem.metricName}) BY TBUCKET(100)${splitAccessorsStr}`;
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

  const metricItems: MetricsGridProps['metricItems'] = [
    {
      metricName: 'system.cpu.utilization',
      dataStream: 'metrics-*',
      units: ['ms'],
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [{ name: 'host.name' }],
    },
    {
      metricName: 'system.memory.utilization',
      dataStream: 'metrics-*',
      units: ['ms'],
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [{ name: 'host.name' }],
    },
  ];

  const defaultProps: MetricsGridProps = {
    columns: 2,
    dimensions: [],
    discoverFetch$: undefined as unknown as UnifiedHistogramFetch$,
    metricItems,
    fetchParams,
    services,
    actions,
  };

  const renderMetricsGrid = (props: Partial<MetricsGridProps> = {}) => {
    return render(
      <MetricsExperienceStateProvider profileId="test-profile">
        <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} {...props} />
      </MetricsExperienceStateProvider>
    );
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
    expect(charts).toHaveLength(metricItems.length);
  });

  it('passes the correct size prop', () => {
    const { rerender } = render(
      <MetricsExperienceStateProvider profileId="test-profile">
        <MetricsGrid
          {...defaultProps}
          columns={3}
          dimensions={[{ name: 'host.name' }]}
          discoverFetch$={discoverFetch$}
        />
      </MetricsExperienceStateProvider>
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 's' }), expect.anything());

    rerender(
      <MetricsExperienceStateProvider profileId="test-profile">
        <MetricsGrid
          {...defaultProps}
          columns={4}
          dimensions={[{ name: 'host.name' }]}
          discoverFetch$={discoverFetch$}
        />
      </MetricsExperienceStateProvider>
    );

    expect(Chart).toHaveBeenCalledWith(expect.objectContaining({ size: 's' }), expect.anything());
  });

  it('passes getUserMessages(metric) result to each chart when getUserMessages is provided', () => {
    const messagesForCpu = [
      {
        uniqueId: 'cpu-message',
        severity: 'warning' as const,
        shortMessage: 'CPU',
        longMessage: 'CPU message',
        fixableInEditor: false,
        displayLocations: [{ id: 'embeddableBadge' as const }],
      },
    ];

    const getUserMessages = jest.fn((metric: (typeof metricItems)[0]) =>
      metric.metricName === 'system.cpu.utilization' ? messagesForCpu : undefined
    );

    renderMetricsGrid({ getUserMessages });

    expect(getUserMessages).toHaveBeenCalledTimes(metricItems.length);
    expect(getUserMessages).toHaveBeenNthCalledWith(1, metricItems[0]);
    expect(getUserMessages).toHaveBeenNthCalledWith(2, metricItems[1]);

    expect(Chart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userMessages: messagesForCpu }),
      expect.anything()
    );
    expect(Chart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userMessages: undefined }),
      expect.anything()
    );
  });

  it('filters dimensions to only those applicable to each metric', () => {
    // mockMetricItems only have dimensionFields: [{ name: 'host.name' }]
    // so service.name and container.id should be filtered out
    const multipleDimensions = [
      { name: 'host.name' },
      { name: 'service.name' },
      { name: 'container.id' },
    ];

    renderMetricsGrid({ dimensions: multipleDimensions });

    expect(createESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        metricItem: expect.any(Object),
        splitAccessors: ['host.name'],
      })
    );

    expect(Chart).toHaveBeenCalledWith(
      expect.objectContaining({
        chartLayers: expect.arrayContaining([
          expect.objectContaining({
            breakdown: ['host.name'],
          }),
        ]),
      }),
      expect.anything()
    );
  });

  it('applies breakdown per-metric when metrics have different dimensionFields', () => {
    const heterogeneousMetrics: MetricsGridProps['metricItems'] = [
      {
        metricName: 'fieldsense.energy.battery.voltage',
        dataStream: 'fieldsense-station-metrics',
        units: [null],
        metricTypes: ['gauge'],
        fieldTypes: [ES_FIELD_TYPES.DOUBLE],
        dimensionFields: [{ name: 'station.id' }, { name: 'sensor.type' }],
      },
      {
        metricName: 'system.cpu.utilization',
        dataStream: 'metrics-hostmetricsreceiver.otel-default',
        units: [null],
        metricTypes: ['gauge'],
        fieldTypes: [ES_FIELD_TYPES.DOUBLE],
        dimensionFields: [{ name: 'attributes.cpu' }, { name: 'host.name' }],
      },
    ];

    // Select station.id, which only exists in the fieldsense metric
    renderMetricsGrid({
      metricItems: heterogeneousMetrics,
      dimensions: [{ name: 'station.id' }],
    });

    // First chart (fieldsense) should get the breakdown
    expect(createESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        metricItem: expect.objectContaining({ metricName: 'fieldsense.energy.battery.voltage' }),
        splitAccessors: ['station.id'],
      })
    );

    // Second chart (hostmetrics) should get no breakdown
    expect(createESQLQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        metricItem: expect.objectContaining({ metricName: 'system.cpu.utilization' }),
        splitAccessors: [],
      })
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
      const multipleFields: MetricsGridProps['metricItems'] = [
        ...metricItems,
        {
          metricName: 'system.disk.utilization',
          dataStream: 'metrics-*',
          units: ['ms'],
          metricTypes: ['counter'],
          fieldTypes: [ES_FIELD_TYPES.LONG],
          dimensionFields: [{ name: 'host.name' }],
        },
        {
          metricName: 'system.network.utilization',
          dataStream: 'metrics-*',
          units: ['ms'],
          metricTypes: ['counter'],
          fieldTypes: [ES_FIELD_TYPES.LONG],
          dimensionFields: [{ name: 'host.name' }],
        },
      ];

      renderMetricsGrid({ metricItems: multipleFields });

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

  describe('flyout dismissal on view details', () => {
    it('should call dismissAllFlyoutsExceptFor with metricInsights when handleViewDetails is triggered', () => {
      renderMetricsGrid();

      // Get the onViewDetails callback passed to the first Chart
      const chartCalls = (Chart as jest.Mock).mock.calls;
      expect(chartCalls.length).toBeGreaterThan(0);

      const firstChartProps = chartCalls[0][0];
      expect(firstChartProps.onViewDetails).toBeDefined();

      // Clear mock to isolate calls from handleViewDetails vs flyout mount useEffect
      (dismissAllFlyoutsExceptFor as jest.Mock).mockClear();

      // Trigger the onViewDetails callback
      act(() => {
        firstChartProps.onViewDetails();
      });

      // Verify dismissAllFlyoutsExceptFor was called from handleViewDetails
      // AND from the flyout's useEffect on mount (2 calls total).
      // The first call is the early dismissal in handleViewDetails (before flyout mounts),
      // the second is the safety-net useEffect inside MetricInsightsFlyout.
      expect(dismissAllFlyoutsExceptFor).toHaveBeenCalledTimes(2);
      expect(dismissAllFlyoutsExceptFor).toHaveBeenCalledWith('metricInsights');
    });
  });
});
