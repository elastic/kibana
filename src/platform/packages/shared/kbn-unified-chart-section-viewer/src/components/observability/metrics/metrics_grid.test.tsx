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
import { ACTION_INSPECT_PANEL } from '@kbn/embeddable-plugin/public';
import { DEFAULT_QUICK_ACTIONS } from '@kbn/embeddable-plugin/public/react_embeddable_system/embeddable_renderer_context';
import { Chart, type ChartProps } from '../../chart';
import { DEFAULT_DISABLED_ACTIONS } from '../../chart/lens_wrapper';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram';
import { getFetchParamsMock, getFetch$Mock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import type { UnifiedHistogramFetch$ } from '@kbn/unified-histogram/types';
import type { UnifiedMetricsGridProps } from '../../../types';
import { createESQLQuery, getMetricUniqueKey } from '../../../common/utils';
import {
  ACTION_COPY_TO_DASHBOARD,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  ACTION_OPEN_IN_DISCOVER,
  ACTION_VIEW_DETAILS,
  FEATURE_FLAGS,
} from '../../../common/constants';
import { useFeatureFlag } from '../../../hooks/use_feature_flag';
import { dismissAllFlyoutsExceptFor, METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/discover-utils';
import {
  MetricsExperienceStateProvider,
  useMetricsExperienceState,
} from './context/metrics_experience_state_provider';
import { withRestorableState } from '../../../restorable_state';
import type { FlyoutState } from '../../../restorable_state';

jest.mock('./hooks/use_fetch_exemplars', () => ({
  useFetchExemplars: jest.fn(() => undefined),
}));

jest.mock('@kbn/discover-utils', () => {
  const {
    METRICS_GRID_HISTOGRAM_PERCENTILES,
    METRICS_GRID_SETTINGS_DEFAULTS: metricsGridSettingsDefaults,
    METRICS_GRID_SIMPLE_AGGREGATIONS,
    METRICS_GRID_SORT_DEFAULTS,
    isHistogramHeatmapVisualization,
  } = jest.requireActual('@kbn/discover-utils/src/data_types/metrics');

  return {
    DiscoverFlyouts: { metricInsights: 'metricInsights' },
    dismissAllFlyoutsExceptFor: jest.fn(),
    fieldConstants: jest.requireActual('@kbn/discover-utils/src/field_constants'),
    METRICS_GRID_HISTOGRAM_PERCENTILES,
    METRICS_GRID_SETTINGS_DEFAULTS: metricsGridSettingsDefaults,
    METRICS_GRID_SIMPLE_AGGREGATIONS,
    METRICS_GRID_SORT_DEFAULTS,
    isHistogramHeatmapVisualization,
  };
});

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useIsWithinMinBreakpoint: jest.fn(() => true),
  };
});

jest.mock('../../chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="chart" />),
}));

jest.mock('../../../hooks/use_feature_flag', () => {
  const actual = jest.requireActual('../../../hooks/use_feature_flag');
  return {
    ...actual,
    useFeatureFlag: jest.fn((_flag: string, fallback: boolean) => fallback),
  };
});

jest.mock('../../../common/utils', () => ({
  ...jest.requireActual('../../../common/utils'),
  createESQLQuery: jest.fn((params) => {
    const { metricItem, splitAccessors = [] } = params;
    const splitAccessorsStr =
      splitAccessors.length > 0
        ? `, ${splitAccessors.map((field: string) => `\`${field}\``).join(', ')}`
        : '';
    return `FROM ${metricItem.indexName} | STATS AVG(${metricItem.metricName}) BY TBUCKET(100)${splitAccessorsStr}`;
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
      indexName: 'metrics-*',
      units: ['ms'],
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [{ name: 'host.name' }],
    },
    {
      metricName: 'system.memory.utilization',
      indexName: 'metrics-*',
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
    isTabSelected: true,
    isComponentVisible: true,
  };

  const renderMetricsGrid = (props: Partial<MetricsGridProps> = {}) => {
    return render(
      <MetricsExperienceStateProvider profileId="test-profile">
        <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} {...props} />
      </MetricsExperienceStateProvider>
    );
  };

  const MetricsGridWithRestorableState = withRestorableState(
    (props: MetricsGridProps & { profileId: string }) => (
      <MetricsExperienceStateProvider profileId={props.profileId}>
        <MetricsGrid {...props} />
      </MetricsExperienceStateProvider>
    )
  );

  const renderMetricsGridWithInitialFlyoutState = (
    initialFlyoutState: FlyoutState | undefined,
    props: Partial<MetricsGridProps> = {}
  ) => {
    return render(
      <MetricsGridWithRestorableState
        {...defaultProps}
        discoverFetch$={discoverFetch$}
        profileId="test-profile"
        initialState={{ flyoutState: initialFlyoutState }}
        {...props}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFeatureFlag).mockImplementation((_flag, fallback) => fallback);
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

  it('passes syncCursor and syncTooltips={false} to each chart for cross-panel cursor sync', () => {
    renderMetricsGrid();

    metricItems.forEach((_, index) => {
      expect(Chart).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({ syncCursor: true, syncTooltips: false }),
        expect.anything()
      );
    });
  });

  it('passes the effective aggregation label as yAxisTitle to each chart', () => {
    renderMetricsGrid();

    // Both metric items are counters; the default counter aggregation is SUM.
    metricItems.forEach((_, index) => {
      expect(Chart).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({
          lensConfig: expect.objectContaining({ yTitle: 'sum' }),
        }),
        expect.anything()
      );
    });
  });

  it.each([
    ['system util', ['system', 'util']],
    ['system*util', ['system', 'util']],
    ['utilizaton', ['utilization']],
    ['not-a-match', []],
  ])('passes precise title highlights for the search term %s', (searchTerm, titleHighlight) => {
    renderMetricsGrid({ searchTerm });

    expect(Chart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ titleHighlight }),
      expect.anything()
    );
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

  it('passes getDescription(metric) result to each chart when getDescription is provided', () => {
    const descriptionForFirst = 'Data stream: metrics-system.cpu-default';

    const getDescription = jest.fn((metric: (typeof metricItems)[0]) =>
      metric.metricName === 'system.cpu.utilization' ? descriptionForFirst : undefined
    );

    renderMetricsGrid({ getDescription });

    expect(getDescription).toHaveBeenCalledTimes(metricItems.length);
    expect(getDescription).toHaveBeenNthCalledWith(1, metricItems[0]);
    expect(getDescription).toHaveBeenNthCalledWith(2, metricItems[1]);

    expect(Chart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        lensConfig: expect.objectContaining({ description: descriptionForFirst }),
      }),
      expect.anything()
    );
    expect(Chart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        lensConfig: expect.objectContaining({ description: undefined }),
      }),
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
        lensConfig: expect.objectContaining({
          layers: expect.arrayContaining([
            expect.objectContaining({
              breakdown: ['host.name'],
            }),
          ]),
        }),
      }),
      expect.anything()
    );
  });

  it('applies breakdown per-metric when metrics have different dimensionFields', () => {
    const heterogeneousMetrics: MetricsGridProps['metricItems'] = [
      {
        metricName: 'fieldsense.energy.battery.voltage',
        indexName: 'fieldsense-station-metrics',
        units: [null],
        metricTypes: ['gauge'],
        fieldTypes: [ES_FIELD_TYPES.DOUBLE],
        dimensionFields: [{ name: 'station.id' }, { name: 'sensor.type' }],
      },
      {
        metricName: 'system.cpu.utilization',
        indexName: 'metrics-hostmetricsreceiver.otel-default',
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

  // Regression coverage for issue #262360: the user-typed source, computed once
  // by the parent and passed as `userSource`, must reach `createESQLQuery` as
  // `originalSource`, so backing-index queries stay at the same scope METRICS_INFO
  // scanned (avoiding cross-backing-index field-type conflicts being re-introduced
  // when the chart query widens back to the parent data stream).
  describe('originalSource plumbing (issue #262360)', () => {
    const backingIndex = '.ds-edge-case-gauge-to-counter-2026.04.29-000001';

    const backingIndexFetchParams: MetricsGridProps['fetchParams'] = getFetchParamsMock({
      filters: [],
      query: { esql: `TS ${backingIndex}` },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-1h', to: 'now' },
    });

    const sourceFetchParams: MetricsGridProps['fetchParams'] = getFetchParamsMock({
      filters: [],
      query: { esql: 'TS edge-case-gauge-to-counter' },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-1h', to: 'now' },
    });

    const globFetchParams: MetricsGridProps['fetchParams'] = getFetchParamsMock({
      filters: [],
      query: { esql: 'TS edge-case-*' },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-1h', to: 'now' },
    });

    it('forwards the user-typed backing index as originalSource', () => {
      renderMetricsGrid({ fetchParams: backingIndexFetchParams, userSource: backingIndex });

      expect(createESQLQuery).toHaveBeenCalledWith(
        expect.objectContaining({ originalSource: backingIndex })
      );
    });

    it('forwards the user-typed data stream as originalSource', () => {
      renderMetricsGrid({
        fetchParams: sourceFetchParams,
        userSource: 'edge-case-gauge-to-counter',
      });

      expect(createESQLQuery).toHaveBeenCalledWith(
        expect.objectContaining({ originalSource: 'edge-case-gauge-to-counter' })
      );
    });

    it('forwards the raw glob pattern as originalSource (createESQLQuery falls back to indexName)', () => {
      renderMetricsGrid({ fetchParams: globFetchParams, userSource: 'edge-case-*' });

      expect(createESQLQuery).toHaveBeenCalledWith(
        expect.objectContaining({ originalSource: 'edge-case-*' })
      );
    });
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
          indexName: 'metrics-*',
          units: ['ms'],
          metricTypes: ['counter'],
          fieldTypes: [ES_FIELD_TYPES.LONG],
          dimensionFields: [{ name: 'host.name' }],
        },
        {
          metricName: 'system.network.utilization',
          indexName: 'metrics-*',
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

  describe('flyout dismissal on open', () => {
    it('dismisses the other flyouts when View details opens the insights flyout', () => {
      const { queryByTestId } = renderMetricsGrid();

      // Get the onViewDetails callback passed to the first Chart
      const chartCalls = (Chart as jest.Mock).mock.calls;
      expect(chartCalls.length).toBeGreaterThan(0);

      const firstChartProps = chartCalls[0][0];
      expect(firstChartProps.onViewDetails).toBeDefined();

      (dismissAllFlyoutsExceptFor as jest.Mock).mockClear();

      // Trigger the onViewDetails callback
      act(() => {
        firstChartProps.onViewDetails();
      });

      expect(dismissAllFlyoutsExceptFor).toHaveBeenCalledTimes(1);
      expect(dismissAllFlyoutsExceptFor).toHaveBeenCalledWith('metricInsights');
      expect(queryByTestId('metricsExperienceFlyout')).toBeInTheDocument();
    });

    it('dismisses the other flyouts when a tab restores its insights flyout', () => {
      (dismissAllFlyoutsExceptFor as jest.Mock).mockClear();

      const initialFlyoutState: FlyoutState = {
        gridPosition: 1,
        metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
        esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
        selectedTabId: 'overview',
      };

      const { queryByTestId, rerender } = render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{ flyoutState: initialFlyoutState }}
          isTabSelected={false}
        />
      );

      expect(dismissAllFlyoutsExceptFor).not.toHaveBeenCalled();
      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();

      rerender(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{ flyoutState: initialFlyoutState }}
          isTabSelected={true}
        />
      );

      expect(dismissAllFlyoutsExceptFor).toHaveBeenCalledWith('metricInsights');
      expect(queryByTestId('metricsExperienceFlyout')).toBeInTheDocument();
    });
  });

  describe('flyout state persistence', () => {
    it('renders the metrics insights flyout when View details is triggered', () => {
      const { queryByTestId } = renderMetricsGrid();

      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();

      const firstChartProps = (Chart as jest.Mock).mock.calls[0][0];

      act(() => {
        firstChartProps.onViewDetails();
      });

      expect(queryByTestId('metricsExperienceFlyout')).toBeInTheDocument();
    });

    it('marks the originating chart as selected when its flyout is open', () => {
      const { getAllByRole } = renderMetricsGrid();

      const firstChartProps = (Chart as jest.Mock).mock.calls[0][0];

      act(() => {
        firstChartProps.onViewDetails();
      });

      const cells = getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-selected', 'true');
      expect(cells[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('marks the restored metric chart as selected', () => {
      const { getAllByRole } = renderMetricsGridWithInitialFlyoutState({
        gridPosition: 1,
        metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
        esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
        selectedTabId: 'overview',
      });

      const cells = getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-selected', 'false');
      expect(cells[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('does not mark any chart as selected when no flyout is open', () => {
      const { getAllByRole } = renderMetricsGrid();

      getAllByRole('gridcell').forEach((cell) => {
        expect(cell).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('does not mark any chart as selected when the owning tab is not active', () => {
      const { getAllByRole } = renderMetricsGridWithInitialFlyoutState(
        {
          gridPosition: 1,
          metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
          esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
          selectedTabId: 'overview',
        },
        { isTabSelected: false }
      );

      getAllByRole('gridcell').forEach((cell) => {
        expect(cell).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('renders the flyout when initial restorable flyoutState references an existing metric', () => {
      const { queryByTestId } = renderMetricsGridWithInitialFlyoutState({
        gridPosition: 1,
        metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
        esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
        selectedTabId: 'overview',
      });

      expect(queryByTestId('metricsExperienceFlyout')).toBeInTheDocument();
    });

    it('does not render the flyout when initial restorable flyoutState references a missing metric', () => {
      const { queryByTestId } = renderMetricsGridWithInitialFlyoutState({
        gridPosition: 0,
        metricUniqueKey: 'metrics-*::no.longer.here',
        esqlQuery: 'FROM metrics-* | STATS AVG(no.longer.here) BY TBUCKET(100)',
        selectedTabId: 'overview',
      });

      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();
    });

    it('preserves restored flyoutState during initial render when metric items are empty (duplicate-tab scenario)', () => {
      const onInitialStateChange = jest.fn();
      const initialFlyoutState: FlyoutState = {
        gridPosition: 0,
        metricUniqueKey: `${metricItems[0].indexName}::${metricItems[0].metricName}`,
        esqlQuery: 'FROM metrics-* | STATS AVG(system.cpu.utilization) BY TBUCKET(100)',
        selectedTabId: 'overview',
      };

      render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          metricItems={[]}
          initialState={{ flyoutState: initialFlyoutState }}
          onInitialStateChange={onInitialStateChange}
        />
      );

      const clearedWithUndefined = onInitialStateChange.mock.calls.some(
        ([state]) => state?.flyoutState === undefined
      );
      expect(clearedWithUndefined).toBe(false);
    });

    it('clears stale flyoutState when the referenced metric is no longer present', () => {
      const onInitialStateChange = jest.fn();

      render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{
            flyoutState: {
              gridPosition: 0,
              metricUniqueKey: 'metrics-*::no.longer.here',
              esqlQuery: 'FROM metrics-* | STATS AVG(no.longer.here) BY TBUCKET(100)',
              selectedTabId: 'overview',
            },
          }}
          onInitialStateChange={onInitialStateChange}
        />
      );

      const lastCall = onInitialStateChange.mock.calls.at(-1)?.[0];
      expect(lastCall?.flyoutState).toBeUndefined();
    });

    it('clears flyoutState when the flyout is closed', () => {
      const onInitialStateChange = jest.fn();

      const { getByTestId, queryByTestId } = render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{
            flyoutState: {
              gridPosition: 0,
              metricUniqueKey: `${metricItems[0].indexName}::${metricItems[0].metricName}`,
              esqlQuery: 'FROM metrics-* | STATS AVG(system.cpu.utilization) BY TBUCKET(100)',
              selectedTabId: 'overview',
            },
          }}
          onInitialStateChange={onInitialStateChange}
        />
      );

      expect(getByTestId('metricsExperienceFlyout')).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(getByTestId('metricsExperienceFlyout'), {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
      });

      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();

      const lastCall = onInitialStateChange.mock.calls.at(-1)?.[0];
      expect(lastCall?.flyoutState).toBeUndefined();
    });

    it('does not render the flyout when isTabSelected is false even with restored flyoutState', () => {
      const { queryByTestId } = renderMetricsGridWithInitialFlyoutState(
        {
          gridPosition: 1,
          metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
          esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
          selectedTabId: 'overview',
        },
        { isTabSelected: false }
      );

      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();
    });

    it('renders the restored flyout once the owning tab becomes active', () => {
      const initialFlyoutState: FlyoutState = {
        gridPosition: 1,
        metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
        esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
        selectedTabId: 'overview',
      };

      const { queryByTestId, rerender } = render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{ flyoutState: initialFlyoutState }}
          isTabSelected={false}
        />
      );

      expect(queryByTestId('metricsExperienceFlyout')).not.toBeInTheDocument();

      rerender(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{ flyoutState: initialFlyoutState }}
          isTabSelected={true}
        />
      );

      expect(queryByTestId('metricsExperienceFlyout')).toBeInTheDocument();
    });

    it('returns focus to the originating grid cell after closing the flyout', () => {
      jest
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback): number => {
          cb(0);
          return 0;
        });

      const { getByTestId, getAllByRole } = render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{
            flyoutState: {
              gridPosition: 1,
              metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
              esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
              selectedTabId: 'overview',
            },
          }}
        />
      );

      const gridCells = getAllByRole('gridcell');

      act(() => {
        fireEvent.keyDown(getByTestId('metricsExperienceFlyout'), {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
      });

      expect(document.activeElement).toBe(gridCells[1]);

      (global.requestAnimationFrame as unknown as jest.SpyInstance).mockRestore();
    });

    it('returns focus to the live metric position when the grid reordered while the flyout was open', () => {
      jest
        .spyOn(global, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback): number => {
          cb(0);
          return 0;
        });

      const { getByTestId, getAllByRole } = render(
        <MetricsGridWithRestorableState
          {...defaultProps}
          discoverFetch$={discoverFetch$}
          profileId="test-profile"
          initialState={{
            flyoutState: {
              gridPosition: 0,
              metricUniqueKey: `${metricItems[1].indexName}::${metricItems[1].metricName}`,
              esqlQuery: 'FROM metrics-* | STATS AVG(system.memory.utilization) BY TBUCKET(100)',
              selectedTabId: 'overview',
            },
          }}
        />
      );

      const gridCells = getAllByRole('gridcell');

      act(() => {
        fireEvent.keyDown(getByTestId('metricsExperienceFlyout'), {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        });
      });

      expect(document.activeElement).toBe(gridCells[1]);

      (global.requestAnimationFrame as unknown as jest.SpyInstance).mockRestore();
    });
  });

  describe('render efficiency', () => {
    // Two metrics whose dimensionFields do NOT overlap.
    // Selecting 'host.name' is only meaningful for the first metric.
    const nonOverlappingMetrics: MetricsGridProps['metricItems'] = [
      {
        metricName: 'system.cpu.utilization',
        indexName: 'metrics-system',
        units: ['ms'],
        metricTypes: ['counter'],
        fieldTypes: [ES_FIELD_TYPES.LONG],
        dimensionFields: [{ name: 'host.name' }],
      },
      {
        metricName: 'k8s.container.cpu',
        indexName: 'metrics-k8s',
        units: ['ms'],
        metricTypes: ['counter'],
        fieldTypes: [ES_FIELD_TYPES.LONG],
        dimensionFields: [{ name: 'container.id' }],
      },
    ];

    it('recomputes esqlQuery only for metrics whose applicable dimensions changed', () => {
      const { rerender } = render(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={nonOverlappingMetrics}
            dimensions={[]}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledTimes(nonOverlappingMetrics.length);
      (createESQLQuery as jest.Mock).mockClear();

      // Select 'host.name'. Only system.cpu.utilization supports it —
      // k8s.container.cpu stays at [] → [] with a stable empty array reference.
      rerender(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={nonOverlappingMetrics}
            dimensions={[{ name: 'host.name' }]}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledTimes(1);
    });

    it('does not recompute esqlQuery when dimensions get a new array with identical content', () => {
      const dimensions = [{ name: 'host.name' }];
      const { rerender } = render(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={nonOverlappingMetrics}
            dimensions={dimensions}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledTimes(nonOverlappingMetrics.length);
      (createESQLQuery as jest.Mock).mockClear();

      rerender(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={nonOverlappingMetrics}
            dimensions={[{ name: 'host.name' }]}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).not.toHaveBeenCalled();
    });

    it('recomputes esqlQuery when a dimension type changes but the name stays the same', () => {
      const hostMetric = nonOverlappingMetrics[0];
      const { rerender } = render(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={[hostMetric]}
            dimensions={[{ name: 'host.name', type: 'keyword' }]}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledTimes(1);
      (createESQLQuery as jest.Mock).mockClear();

      rerender(
        <MetricsExperienceStateProvider profileId="test-profile">
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={[hostMetric]}
            dimensions={[{ name: 'host.name', type: 'ip' }]}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledTimes(1);
    });

    it('does not re-render ChartItem when an unrelated context value changes', () => {
      const CurrentPageControl = () => {
        const { currentPage, onPageChange } = useMetricsExperienceState();

        return (
          <button
            type="button"
            data-test-subj="currentPageControl"
            onClick={() => onPageChange(currentPage + 1)}
          >
            {currentPage}
          </button>
        );
      };

      render(
        <MetricsExperienceStateProvider profileId="test-profile">
          <CurrentPageControl />
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      expect(Chart).toHaveBeenCalledTimes(metricItems.length);
      (Chart as jest.Mock).mockClear();

      fireEvent.click(screen.getByTestId('currentPageControl'));

      expect(screen.getByTestId('currentPageControl')).toHaveTextContent('1');
      expect(Chart).not.toHaveBeenCalled();
    });

    it('re-renders ChartItem when a relevant context value changes', () => {
      const { rerender } = render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={{
            counterAggregation: 'max',
            gaugeAggregation: 'avg',
            histogramPercentile: 'p90',
            histogramVisualization: 'lnsXY',
            dimensions: [],
            searchTerm: '',
          }}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      expect(Chart).toHaveBeenCalledTimes(metricItems.length);
      (Chart as jest.Mock).mockClear();

      rerender(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={{
            counterAggregation: 'max',
            gaugeAggregation: 'avg',
            histogramPercentile: 'p95',
            histogramVisualization: 'lnsXY',
            dimensions: [],
            searchTerm: '',
          }}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      expect(Chart).toHaveBeenCalledTimes(metricItems.length);
    });
  });

  describe('gridSettings', () => {
    it('forwards gridSettings from context into createESQLQuery for each metric', () => {
      render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={{
            counterAggregation: 'max',
            gaugeAggregation: 'avg',
            histogramPercentile: 'p90',
            histogramVisualization: 'lnsXY',
            dimensions: [],
            searchTerm: '',
          }}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gridSettings: {
            counterAggregation: 'max',
            gaugeAggregation: 'avg',
            histogramPercentile: 'p90',
            histogramVisualization: 'lnsXY',
            dimensions: [],
            searchTerm: '',
          },
        })
      );
    });
  });

  describe('recently explored', () => {
    // The chart is mocked, so render a panel action control inside it to simulate the
    // embeddable's quick-action buttons that the cell click handler looks for.
    const renderChartWithPanelAction = () => {
      (Chart as jest.Mock).mockImplementation(() => (
        <div data-test-subj="chart">
          <button type="button" data-test-subj="embeddablePanelAction-ACTION_INSPECT_PANEL" />
        </div>
      ));
    };

    afterEach(() => {
      (Chart as jest.Mock).mockImplementation(() => <div data-test-subj="chart" />);
    });

    it('records the metric as explored when a panel action is clicked', () => {
      renderChartWithPanelAction();
      const onMetricExplored = jest.fn();
      const { container } = render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          onMetricExplored={onMetricExplored}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      fireEvent.click(
        container.querySelector(
          '[data-chart-index="0"] [data-test-subj="embeddablePanelAction-ACTION_INSPECT_PANEL"]'
        ) as HTMLElement
      );

      expect(onMetricExplored).toHaveBeenCalledTimes(1);
      expect(onMetricExplored).toHaveBeenCalledWith('metrics-*::system.cpu.utilization');
    });

    it('does not record the metric when clicking outside panel actions', () => {
      renderChartWithPanelAction();
      const onMetricExplored = jest.fn();
      const { container } = render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          onMetricExplored={onMetricExplored}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} />
        </MetricsExperienceStateProvider>
      );

      fireEvent.click(container.querySelector('[data-chart-index="0"]') as HTMLElement);

      expect(onMetricExplored).not.toHaveBeenCalled();
    });
  });

  describe('histogram heatmaps', () => {
    const histogramItem: MetricsGridProps['metricItems'][number] = {
      metricName: 'latency.exp',
      indexName: 'metrics-a',
      units: ['ms'],
      metricTypes: ['histogram'],
      fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
      dimensionFields: [{ name: 'host.name' }],
    };
    const bounds = new Map([[getMetricUniqueKey(histogramItem), { bounds: { min: 1, max: 9 } }]]);
    const distributionGridSettings = {
      ...METRICS_GRID_SETTINGS_DEFAULTS,
      histogramVisualization: 'lnsHeatmap' as const,
    };

    const renderMetricsGridWithHistDistributions = (props: Partial<MetricsGridProps> = {}) =>
      render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={distributionGridSettings}
        >
          <MetricsGrid {...defaultProps} discoverFetch$={discoverFetch$} {...props} />
        </MetricsExperienceStateProvider>
      );

    const enableHeatmaps = () => {
      jest
        .mocked(useFeatureFlag)
        .mockImplementation((flag, fallback) =>
          flag === FEATURE_FLAGS.IS_HEATMAPS_ENABLED ? true : fallback
        );
    };

    it('keeps the percentile chart when a percentile is selected and the flag is on', () => {
      enableHeatmaps();
      render(
        <MetricsExperienceStateProvider
          profileId="test-profile"
          gridSettings={{
            counterAggregation: 'sum',
            gaugeAggregation: 'avg',
            histogramPercentile: 'p95',
            histogramVisualization: 'lnsXY',
            dimensions: [],
            searchTerm: '',
          }}
        >
          <MetricsGrid
            {...defaultProps}
            discoverFetch$={discoverFetch$}
            metricItems={[histogramItem]}
            histogramBounds={bounds}
          />
        </MetricsExperienceStateProvider>
      );

      expect(createESQLQuery).toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          disableClickFilter: false,
          lensConfig: expect.objectContaining({
            chartType: 'xy',
            yTitle: 'p95',
            dataset: expect.objectContaining({
              esql: expect.not.stringContaining('BUCKET(latency.exp'),
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('keeps the percentile chart when the heatmaps flag is off', () => {
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: bounds,
      });

      expect(createESQLQuery).toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          disableClickFilter: false,
          lensConfig: expect.objectContaining({ chartType: 'xy' }),
        }),
        expect.anything()
      );
    });

    it('keeps the data stream description on the heatmap', () => {
      enableHeatmaps();
      const description = 'Data stream: metrics-a';
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: bounds,
        getDescription: () => description,
      });

      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          lensConfig: expect.objectContaining({
            chartType: 'heatmap',
            description,
          }),
        }),
        expect.anything()
      );
    });

    it('draws a heatmap from the distribution query when bounds exist', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: bounds,
      });

      expect(createESQLQuery).not.toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          disableClickFilter: true,
          lensConfig: expect.objectContaining({
            chartType: 'heatmap',
            title: histogramItem.metricName,
            ySort: 'desc',
            dataset: {
              esql: expect.stringMatching(/BUCKET\(latency\.exp, 10, 1, 9\)/),
            },
            color: expect.objectContaining({ type: 'dynamic', steps: expect.any(Array) }),
          }),
        }),
        expect.anything()
      );
    });

    it('draws a heatmap when the upper and lower bounds are the same', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: new Map([
          [getMetricUniqueKey(histogramItem), { bounds: { min: 5, max: 5 } }],
        ]),
      });

      expect(createESQLQuery).not.toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          disableClickFilter: true,
          lensConfig: expect.objectContaining({
            chartType: 'heatmap',
            dataset: {
              esql: expect.stringContaining('BUCKET(latency.exp, 10, 5, 5.000005)'),
            },
          }),
        }),
        expect.anything()
      );
    });

    it('uses the series chart when a breakdown applies to the histogram', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        dimensions: [{ name: 'host.name' }],
        histogramBounds: bounds,
      });

      expect(createESQLQuery).toHaveBeenCalledWith(
        expect.objectContaining({ splitAccessors: ['host.name'] })
      );
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          disableClickFilter: false,
          lensConfig: expect.objectContaining({
            chartType: 'xy',
            dataset: expect.objectContaining({
              esql: expect.stringContaining('`host.name`'),
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('keeps gauge and counter charts on the percentile path while the flag is on', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [metricItems[0], histogramItem],
        histogramBounds: bounds,
      });

      expect(createESQLQuery).toHaveBeenCalledTimes(1);
      expect(Chart).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          disableClickFilter: true,
          lensConfig: expect.objectContaining({ chartType: 'heatmap' }),
        }),
        expect.anything()
      );
    });

    it('waits for bounds before drawing a histogram', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBoundsLoading: true,
      });

      expect(createESQLQuery).not.toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: true,
          disableClickFilter: false,
          lensConfig: expect.objectContaining({
            chartType: 'xy',
            layers: [],
            dataset: { esql: '' },
          }),
        }),
        expect.anything()
      );
    });

    it('uses the series chart when bounds are missing', () => {
      enableHeatmaps();
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: new Map(),
        histogramBoundsLoading: false,
      });

      expect(createESQLQuery).toHaveBeenCalled();
      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: undefined,
          disableClickFilter: false,
          lensConfig: expect.objectContaining({ chartType: 'xy' }),
        }),
        expect.anything()
      );
    });

    it('passes a bounds error to the chart', () => {
      enableHeatmaps();
      const error = new Error('bounds failed');
      renderMetricsGridWithHistDistributions({
        metricItems: [histogramItem],
        histogramBounds: new Map([[getMetricUniqueKey(histogramItem), { error }]]),
      });

      expect(Chart).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          disableClickFilter: false,
          lensConfig: expect.objectContaining({ chartType: 'xy', layers: [] }),
        }),
        expect.anything()
      );
    });
  });

  describe('panel actions', () => {
    it('classifies every default panel view action as shown, disabled, or incompatible', () => {
      // These default panel actions cannot become compatible with a Lens metric panel.
      const incompatibleWithMetricPanels = [
        'clearControl',
        'ACTION_SHOW_CONFIG_PANEL',
        'ACTION_VIEW_SAVED_SEARCH',
        'togglePanel',
      ];

      renderMetricsGrid();

      const chartProps = (Chart as jest.Mock).mock.calls[0][0] as ChartProps;
      expect(chartProps.quickActionIds).toEqual([
        ACTION_EXPLORE_IN_DISCOVER_TAB,
        ACTION_INSPECT_PANEL,
        ACTION_VIEW_DETAILS,
        ACTION_COPY_TO_DASHBOARD,
      ]);
      expect(chartProps.extraDisabledActions).toEqual([ACTION_OPEN_IN_DISCOVER]);

      const defaultViewActionIds = (DEFAULT_QUICK_ACTIONS.view ?? []).filter((id): id is string =>
        Boolean(id)
      );
      const visibleOrDisabled = new Set<string>([
        ...(chartProps.quickActionIds ?? []).filter((id): id is string => Boolean(id)),
        ...DEFAULT_DISABLED_ACTIONS,
        ...(chartProps.extraDisabledActions ?? []),
      ]);

      const staleExceptions = incompatibleWithMetricPanels.filter(
        (id) => !defaultViewActionIds.includes(id)
      );
      expect(staleExceptions).toEqual([]);

      const unaccounted = defaultViewActionIds.filter(
        (id) => !visibleOrDisabled.has(id) && !incompatibleWithMetricPanels.includes(id)
      );
      expect(unaccounted).toEqual([]);
    });
  });
});
