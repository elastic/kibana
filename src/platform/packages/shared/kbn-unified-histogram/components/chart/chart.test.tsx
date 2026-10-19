/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { createDefaultInspectorAdapters, type Datatable } from '@kbn/expressions-plugin/common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { UnifiedHistogramFetchStatus } from '../../types';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { allSuggestionsMock } from '../../__mocks__/suggestions';
import { checkChartAvailability } from './utils/check_chart_availability';
import type { DataSource } from '@kbn/data-source';
import { DataViewSource, EsqlSource } from '@kbn/data-source';
import { dataViewMock } from '../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { getFetchParamsMock, getFetch$Mock } from '../../__mocks__/fetch_params';
import { getLensVisMock } from '../../__mocks__/lens_vis';
import { of } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { UnifiedHistogramChart, type UnifiedHistogramChartProps } from './chart';
import { lensSaveModalComponentMock, unifiedHistogramServicesMock } from '../../__mocks__/services';
import userEvent from '@testing-library/user-event';

jest.mock('./hooks/use_edit_visualization', () => ({
  useEditVisualization: () => mockUseEditVisualization,
}));

let mockUseEditVisualization: jest.Mock | undefined = jest.fn();
const mockedSearchSourceInstanceMockFetch$ = jest.mocked(searchSourceInstanceMock.fetch$);

interface MountComponentProps {
  noChart?: boolean;
  noHits?: boolean;
  noBreakdown?: boolean;
  chartHidden?: boolean;
  dataSource?: DataSource;
  allSuggestions?: Suggestion[];
  isEsql?: boolean;
  hasDashboardPermissions?: boolean;
  isChartLoading?: boolean;
  isTransformationalESQL?: boolean;
  mockEditVisualization?: jest.Mock | undefined;
  withLensActions?: boolean;
  comparison?: UnifiedHistogramChartProps['comparison'];
}

const toggleActionsTestId = 'default-chart-toggle-actions';

const mountComponent = async (mountProps: MountComponentProps = {}) => {
  const {
    noChart,
    noHits,
    noBreakdown,
    chartHidden = false,
    dataSource: propsDataSource,
    allSuggestions,
    isEsql,
    hasDashboardPermissions,
    isChartLoading,
    isTransformationalESQL,
    withLensActions,
    comparison,
  } = mountProps;
  const dataSource = propsDataSource ?? new DataViewSource(dataViewWithTimefieldMock);
  const lensDataView =
    dataSource instanceof DataViewSource ? dataSource.getDataView() : dataViewWithTimefieldMock;
  const esqlQuery = isTransformationalESQL
    ? 'from logs | limit 10 | stats var0 = avg(bytes) by extension'
    : 'from logs | limit 10';
  EsqlSource.clearCache();
  const fetchDataSource = isEsql
    ? await EsqlSource.create({
        query: esqlQuery,
        timeFieldName: dataSource.isTimeBased() ? '@timestamp' : undefined,
      })
    : dataSource;

  // Handle mockEditVisualization separately to distinguish between "not passed" and "passed as undefined"
  mockUseEditVisualization =
    'mockEditVisualization' in mountProps ? mountProps.mockEditVisualization : jest.fn();
  mockedSearchSourceInstanceMockFetch$.mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: noHits ? 0 : 2 } } }))
  );

  const services = {
    ...unifiedHistogramServicesMock,
    capabilities: {
      dashboard_v2: {
        showWriteControls: hasDashboardPermissions ?? true,
      },
    } as unknown as Capabilities,
  };

  const chart = noChart
    ? undefined
    : {
        status: 'complete' as UnifiedHistogramFetchStatus,
        hidden: chartHidden,
        timeInterval: 'auto',
        bucketInterval: {
          scaled: true,
          description: 'test',
          scale: 2,
        },
      };

  const fetchParams = getFetchParamsMock({
    dataSource: fetchDataSource,
    query: isEsql
      ? { esql: esqlQuery }
      : {
          language: 'kuery',
          query: '',
        },
    filters: [],
    esqlVariables: [],
    relativeTimeRange: { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' },
  });
  fetchParams.breakdown = noBreakdown ? undefined : { field: undefined };

  const lensVisService = (
    await getLensVisMock({
      query: fetchParams.query,
      filters: fetchParams.filters,
      timeInterval: 'auto',
      dataView: lensDataView,
      breakdownField: fetchParams.breakdown?.field,
      columns: [],
      allSuggestions,
      isTransformationalESQL,
    })
  ).lensService;

  const props: UnifiedHistogramChartProps = {
    lensVisService,
    lensVisServiceState: lensVisService.state$.getValue(),
    services,
    hits: noHits
      ? undefined
      : {
          status: 'complete' as UnifiedHistogramFetchStatus,
          total: 2,
        },
    chart,
    isChartLoading: Boolean(isChartLoading),
    onChartHiddenChange: jest.fn(),
    onTimeIntervalChange: jest.fn(),
    withDefaultActions: undefined,
    isChartAvailable: checkChartAvailability({ chart, dataSource: fetchDataSource }),
    withLensActions,
    renderToggleActions: () => <span data-test-subj={toggleActionsTestId}>Toggle actions</span>,
    fetch$: getFetch$Mock(),
    fetchParams,
    dataLoading$: undefined,
    lensAdapters: undefined,
    comparison,
  };

  const { rerender } = renderWithI18n(<UnifiedHistogramChart {...props} />);

  act(() => {
    props.fetch$?.next({
      fetchParams: props.fetchParams,
      lensVisServiceState: props.lensVisServiceState,
    });
  });

  return { mockOnEditVisualization: mockUseEditVisualization, props, rerender };
};

describe('Chart', () => {
  test('renders a hidden placeholder when chart is undefined', async () => {
    await mountComponent({ noChart: true });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
  });

  test('should render chart toggle actions when chart is defined', async () => {
    await mountComponent();

    expect(screen.queryByTestId(toggleActionsTestId)).toBeVisible();
  });

  test('should not render chart toggle actions when chart is hidden', async () => {
    await mountComponent({ chartHidden: true });

    expect(screen.queryByTestId(toggleActionsTestId)).not.toBeInTheDocument();
  });

  test('render when chart is defined and onEditVisualization is undefined', async () => {
    await mountComponent({ mockEditVisualization: undefined });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit visualization' })).not.toBeInTheDocument();
  });

  test('render when chart is defined and onEditVisualization is defined', async () => {
    await mountComponent();

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
  });

  test('render when chart.hidden is true', async () => {
    await mountComponent({ chartHidden: true });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
  });

  test('render when chart.hidden is false', async () => {
    await mountComponent({ chartHidden: false });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
  });

  test('should render when is text based, transformational and non-time-based', async () => {
    await mountComponent({
      isEsql: true,
      dataSource: new DataViewSource(dataViewMock),
      isTransformationalESQL: true,
    });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save visualization to dashboard' })).toBeVisible();
  });

  test('should not render when is text based, non-transformational and non-time-based', async () => {
    await mountComponent({
      isEsql: true,
      dataSource: new DataViewSource(dataViewMock),
      isTransformationalESQL: false,
    });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit visualization' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save visualization to dashboard' })
    ).not.toBeInTheDocument();
  });

  test('should not render when is text based, non-transformational, non-time-based and suggestions are available', async () => {
    await mountComponent({
      allSuggestions: allSuggestionsMock,
      isEsql: true,
      dataSource: new DataViewSource(dataViewMock),
      isTransformationalESQL: false,
    });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit visualization' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save visualization to dashboard' })
    ).not.toBeInTheDocument();
  });

  test('should render when is text based, non-transformational and time-based', async () => {
    await mountComponent({
      isEsql: true,
      isTransformationalESQL: false,
    });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save visualization to dashboard' })).toBeVisible();
  });

  test('should render when is text based, transformational and time-based', async () => {
    await mountComponent({
      isEsql: true,
      isTransformationalESQL: true,
    });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save visualization to dashboard' })).toBeVisible();
  });

  test('should not render when is text based, transformational and no suggestions available', async () => {
    await mountComponent({
      allSuggestions: [],
      isEsql: true,
      isTransformationalESQL: true,
    });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit visualization' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save visualization to dashboard' })
    ).not.toBeInTheDocument();
  });

  test('render progress bar when text based and request is loading', async () => {
    jest.useFakeTimers();

    await mountComponent({ isEsql: true, isChartLoading: true });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    const section = screen.getByTestId('unifiedHistogramRendered');
    const progressBar = section.querySelector('.euiProgress');

    expect(progressBar).toBeVisible();
    expect(progressBar).toHaveClass('euiProgress');

    jest.useRealTimers();
  });

  test('triggers onEditVisualization on click', async () => {
    const user = userEvent.setup();
    const { mockOnEditVisualization } = await mountComponent();

    expect(mockOnEditVisualization).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Edit visualization' }));

    expect(mockOnEditVisualization).toHaveBeenCalled();
  });

  it('should not render chart if data view is not time based', async () => {
    await mountComponent({ dataSource: new DataViewSource(dataViewMock) });

    expect(screen.queryByText('unifiedHistogramChart')).not.toBeInTheDocument();
  });

  it('should render chart if data view is time based', async () => {
    await mountComponent();

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
  });

  it('should render BreakdownFieldSelector when chart is visible and breakdown is defined', async () => {
    await mountComponent();

    expect(screen.getByText('No breakdown')).toBeVisible();
  });

  it('should not render BreakdownFieldSelector when chart is hidden', async () => {
    await mountComponent({ chartHidden: true });

    expect(screen.queryByText('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByText('No breakdown')).not.toBeInTheDocument();
  });

  it('should not render BreakdownFieldSelector when chart is visible and breakdown is undefined', async () => {
    await mountComponent({ noBreakdown: true });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.queryByText('No breakdown')).not.toBeInTheDocument();
  });

  it('should not render the save button when text-based and the dashboard save by value permissions are false', async () => {
    await mountComponent({
      allSuggestions: [],
      isTransformationalESQL: false,
      isEsql: true,
      hasDashboardPermissions: false,
    });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Save visualization to dashboard' })
    ).not.toBeInTheDocument();
  });

  it('should not render the save button when the dashboard save by value permissions are false', async () => {
    await mountComponent({
      allSuggestions: allSuggestionsMock,
      hasDashboardPermissions: false,
    });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Save visualization to dashboard' })
    ).not.toBeInTheDocument();
  });

  it('hides Lens edit and save actions when withLensActions is false', async () => {
    await mountComponent({
      isEsql: true,
      dataSource: new DataViewSource(dataViewMock),
      isTransformationalESQL: true,
      withLensActions: false,
    });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramEditFlyoutVisualization')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unifiedHistogramEditVisualization')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unifiedHistogramSaveVisualization')).not.toBeInTheDocument();
  });

  it('hides the Lens app edit action when withLensActions is false', async () => {
    await mountComponent({ withLensActions: false });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramEditVisualization')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unifiedHistogramSaveVisualization')).not.toBeInTheDocument();
  });

  it('opens save modal with an empty title', async () => {
    const user = userEvent.setup();
    lensSaveModalComponentMock.mockClear();

    await mountComponent({
      isEsql: true,
      isTransformationalESQL: true,
      dataSource: new DataViewSource(dataViewMock),
    });

    await user.click(screen.getByRole('button', { name: 'Save visualization to dashboard' }));

    expect(lensSaveModalComponentMock).toHaveBeenCalled();
    const firstCall = lensSaveModalComponentMock.mock.calls[0] as unknown as
      | [{ initialInput: { attributes: { title: string } } }]
      | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall![0].initialInput.attributes.title).toBe('');
  });

  describe('comparison', () => {
    const embeddable = jest.mocked(unifiedHistogramServicesMock.lens.EmbeddableComponent);
    const lastLensProps = () => embeddable.mock.calls[embeddable.mock.calls.length - 1][0];
    const histogramTable = {
      type: 'datatable',
      columns: [
        {
          id: 'timestamp',
          name: '@timestamp every 30 minute',
          meta: { type: 'date', esMeta: { bucket: { interval: 30, unit: 'minute' } } },
        },
        { id: 'results', name: 'results', meta: { type: 'number' } },
      ],
      rows: [
        { timestamp: 1, results: 10 },
        { timestamp: 2, results: 4 },
      ],
    } as Datatable;
    const layerId = '662552df-2cdc-4539-bf3b-73b9f827252c';
    const histogramAdapters = () => {
      const adapters = createDefaultInspectorAdapters();
      adapters.tables.tables[layerId] = histogramTable;
      return adapters;
    };
    const histogramAttributes = {
      title: 'Histogram',
      visualizationType: 'lnsXY',
      references: [],
      state: {
        datasourceStates: {
          textBased: {
            layers: {
              [layerId]: {
                columns: [
                  { columnId: 'timestamp', fieldName: 'timestamp', meta: { type: 'date' } },
                  { columnId: 'results', fieldName: 'results', meta: { type: 'number' } },
                ],
              },
            },
          },
        },
        visualization: {
          layers: [{ layerId, seriesType: 'bar_stacked', accessors: ['results'] }],
        },
        query: { esql: 'from logs' },
        filters: [],
      },
    } as unknown as LensAttributes;
    const createComparison = () => ({
      key: 'pattern',
      label: 'Failed login',
      loadCounts: jest.fn().mockResolvedValue([{ timestamp: 1, count: 3 }]),
      onResult: jest.fn(),
    });
    const mountHistogramComparison = async (
      comparison: UnifiedHistogramChartProps['comparison']
    ) => {
      const mounted = await mountComponent({ isEsql: true, comparison });
      const { fetch$, fetchParams, lensVisServiceState } = mounted.props;
      act(() => {
        fetch$.next({
          fetchParams,
          lensVisServiceState: {
            ...lensVisServiceState,
            visContext: { ...lensVisServiceState.visContext!, attributes: histogramAttributes },
          },
        });
      });
      return mounted;
    };

    beforeEach(() => embeddable.mockClear());

    it('reports unavailable without counting when the chart is not a single bar series', async () => {
      const comparison = createComparison();
      await mountComponent({ isEsql: true, comparison });

      await act(async () => {
        lastLensProps().onLoad?.(false, histogramAdapters());
      });

      expect(comparison.loadCounts).not.toHaveBeenCalled();
      expect(comparison.onResult).toHaveBeenLastCalledWith({
        key: 'pattern',
        status: 'unavailable',
      });
    });

    it('counts the selection with the params that loaded the histogram and stacks it first', async () => {
      const comparison = createComparison();
      const { props } = await mountHistogramComparison(comparison);

      expect(comparison.onResult).toHaveBeenLastCalledWith({ key: 'pattern', status: 'loading' });

      await act(async () => {
        lastLensProps().onLoad?.(false, histogramAdapters());
      });

      expect(comparison.loadCounts).toHaveBeenCalledWith({
        fetchParams: props.fetchParams,
        timeField: '@timestamp',
        timeColumn: 'timestamp',
        interval: '30 minute',
        signal: expect.any(AbortSignal),
      });
      expect(comparison.onResult).toHaveBeenLastCalledWith({ key: 'pattern', status: 'applied' });
      const visualization = lastLensProps().attributes.state.visualization as {
        layers: Array<{ accessors: string[] }>;
      };
      expect(visualization.layers[0].accessors).toEqual(['overlay', 'remainder']);
      expect(
        lastLensProps().attributes.state.datasourceStates.textBased?.layers[layerId]?.table?.rows[0]
      ).toEqual({ timestamp: 1, results: 10, overlay: 3, remainder: 7 });
    });

    it('does not treat the comparison render as a new histogram load', async () => {
      const comparison = createComparison();
      await mountHistogramComparison(comparison);
      const { onLoad } = lastLensProps();

      await act(async () => {
        onLoad?.(false, histogramAdapters());
      });
      expect(comparison.onResult).toHaveBeenLastCalledWith({ key: 'pattern', status: 'applied' });

      // Lens keeps calling the `onLoad` it was mounted with, including for the comparison render.
      await act(async () => {
        onLoad?.(true, undefined);
        onLoad?.(false, histogramAdapters());
      });

      expect(comparison.loadCounts).toHaveBeenCalledTimes(1);
      expect(comparison.onResult).toHaveBeenLastCalledWith({ key: 'pattern', status: 'applied' });
      const visualization = lastLensProps().attributes.state.visualization as {
        layers: Array<{ accessors: string[] }>;
      };
      expect(visualization.layers[0].accessors).toEqual(['overlay', 'remainder']);
    });

    it('does not count against a table loaded for previous fetch params', async () => {
      const comparison = createComparison();
      const { props, rerender } = await mountHistogramComparison(comparison);
      const staleOnLoad = lastLensProps().onLoad;

      rerender(<UnifiedHistogramChart {...props} fetchParams={{ ...props.fetchParams }} />);
      await act(async () => {
        staleOnLoad?.(false, histogramAdapters());
      });

      expect(comparison.loadCounts).not.toHaveBeenCalled();
      expect(comparison.onResult).toHaveBeenLastCalledWith({ key: 'pattern', status: 'loading' });
    });
  });
});
