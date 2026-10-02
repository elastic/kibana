/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import {
  TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META,
  TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META,
} from '@kbn/lens-common';
import type { UnifiedHistogramFetchStatus } from '../../types';
import type { UnifiedHistogramOverlaySeries } from './histogram_overlay';
import React, { useState } from 'react';
import { act, screen } from '@testing-library/react';
import { createDefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { allSuggestionsMock } from '../../__mocks__/suggestions';
import { checkChartAvailability } from './utils/check_chart_availability';
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
  dataView?: DataView;
  allSuggestions?: Suggestion[];
  isPlainRecord?: boolean;
  hasDashboardPermissions?: boolean;
  isChartLoading?: boolean;
  isTransformationalESQL?: boolean;
  mockEditVisualization?: jest.Mock | undefined;
  overlaySeries?: UnifiedHistogramOverlaySeries;
  onOverlaySeriesResult?: jest.Mock;
  rerenderParent?: boolean;
  withLensActions?: boolean;
}

const toggleActionsTestId = 'default-chart-toggle-actions';

const mountComponent = async (mountProps: MountComponentProps = {}) => {
  const {
    noChart,
    noHits,
    noBreakdown,
    chartHidden = false,
    dataView = dataViewWithTimefieldMock,
    allSuggestions,
    isPlainRecord,
    hasDashboardPermissions,
    isChartLoading,
    isTransformationalESQL,
    overlaySeries,
    onOverlaySeriesResult,
    rerenderParent,
    withLensActions,
  } = mountProps;

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
    dataView,
    query: isPlainRecord
      ? isTransformationalESQL
        ? { esql: 'from logs | limit 10 | stats var0 = avg(bytes) by extension' }
        : { esql: 'from logs | limit 10' }
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
      isPlainRecord: Boolean(isPlainRecord),
      timeInterval: 'auto',
      dataView,
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
    withLensActions,
    isChartAvailable: checkChartAvailability({ chart, dataView, isPlainRecord }),
    renderToggleActions: () => <span data-test-subj={toggleActionsTestId}>Toggle actions</span>,
    fetch$: getFetch$Mock(),
    fetchParams,
    dataLoading$: undefined,
    lensAdapters: undefined,
    overlaySeries,
    onOverlaySeriesResult,
  };

  const ChartParent = () => {
    const [, setNonce] = useState(0);

    return (
      <>
        <button type="button" onClick={() => setNonce((nonce) => nonce + 1)}>
          Rerender chart
        </button>
        <UnifiedHistogramChart {...props} />
      </>
    );
  };

  renderWithI18n(rerenderParent ? <ChartParent /> : <UnifiedHistogramChart {...props} />);

  act(() => {
    props.fetch$?.next({
      fetchParams: props.fetchParams,
      lensVisServiceState: props.lensVisServiceState,
    });
  });

  return { mockOnEditVisualization: mockUseEditVisualization };
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
      isPlainRecord: true,
      dataView: dataViewMock,
      isTransformationalESQL: true,
    });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save visualization to dashboard' })).toBeVisible();
  });

  test('should not render when is text based, non-transformational and non-time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
      dataView: dataViewMock,
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
      isPlainRecord: true,
      dataView: dataViewMock,
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
      isPlainRecord: true,
      isTransformationalESQL: false,
    });

    expect(screen.getByTestId(toggleActionsTestId)).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit visualization' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save visualization to dashboard' })).toBeVisible();
  });

  test('should render when is text based, transformational and time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
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
      isPlainRecord: true,
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

    await mountComponent({ isPlainRecord: true, isChartLoading: true });

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
    await mountComponent({ dataView: dataViewMock });

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
      isPlainRecord: true,
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
      isPlainRecord: true,
      dataView: dataViewMock,
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
      isPlainRecord: true,
      isTransformationalESQL: true,
      dataView: dataViewMock,
    });

    await user.click(screen.getByRole('button', { name: 'Save visualization to dashboard' }));

    expect(lensSaveModalComponentMock).toHaveBeenCalled();
    const firstCall = lensSaveModalComponentMock.mock.calls[0] as unknown as
      | [{ initialInput: { attributes: { title: string } } }]
      | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall![0].initialInput.attributes.title).toBe('');
  });

  it('keeps the overlay result through loading and reports completed or failed loads', async () => {
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent as jest.Mock;
    embeddable.mockClear();
    const onOverlaySeriesResult = jest.fn();
    const sourceQuery = 'from logs | limit 10';
    const sourceTimeRange = {
      from: '2025-10-07T22:00:00.000Z',
      to: '2025-11-07T15:56:36.264Z',
    };
    const overlaySeries: UnifiedHistogramOverlaySeries = {
      key: 'pattern',
      label: 'Selected pattern',
      values: [1],
      timeField: 'timestamp',
      from: sourceTimeRange.from,
      to: sourceTimeRange.to,
      sourceQuery,
      sourceTimeRange,
      isSampled: true,
    };

    await mountComponent({
      allSuggestions: [],
      isPlainRecord: true,
      noBreakdown: true,
      overlaySeries,
      onOverlaySeriesResult,
    });

    const lensProps = embeddable.mock.calls.at(-1)?.[0] as
      | {
          attributes?: {
            state?: { visualization?: { layers?: Array<{ accessors?: string[] }> } };
          };
          onLoad?: (
            isLoading: boolean,
            adapters: ReturnType<typeof createDefaultInspectorAdapters> | undefined
          ) => void;
        }
      | undefined;
    const onLoad = lensProps?.onLoad;

    expect(lensProps?.attributes?.state?.visualization?.layers?.[0].accessors).toEqual([
      'remainder',
      'overlay',
    ]);
    expect(onLoad).toBeDefined();

    onLoad?.(true, undefined);
    expect(onOverlaySeriesResult).not.toHaveBeenCalled();

    const adapters = createDefaultInspectorAdapters();
    adapters.tables.tables.layer = {
      type: 'datatable',
      columns: [],
      rows: [],
      meta: {
        [TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]: true,
        [TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]: true,
      },
    };
    onLoad?.(false, adapters);

    expect(onOverlaySeriesResult).toHaveBeenLastCalledWith({
      key: 'pattern',
      applied: true,
      approximate: true,
    });

    const failedAdapters = createDefaultInspectorAdapters();
    jest
      .spyOn(failedAdapters.requests, 'getRequests')
      .mockReturnValue([{ status: RequestStatus.ERROR } as never]);
    onLoad?.(true, failedAdapters);

    expect(onOverlaySeriesResult).toHaveBeenLastCalledWith({
      key: 'pattern',
      applied: false,
      approximate: false,
    });
  });

  it('keeps the Lens embeddable mounted when the parent rerenders an active overlay', async () => {
    const user = userEvent.setup();
    const embeddable = unifiedHistogramServicesMock.lens.EmbeddableComponent as jest.Mock;
    embeddable.mockClear();
    const sourceTimeRange = {
      from: '2025-10-07T22:00:00.000Z',
      to: '2025-11-07T15:56:36.264Z',
    };

    await mountComponent({
      allSuggestions: [],
      isPlainRecord: true,
      noBreakdown: true,
      rerenderParent: true,
      overlaySeries: {
        key: 'pattern',
        label: 'Selected pattern',
        values: [1],
        timeField: 'timestamp',
        from: sourceTimeRange.from,
        to: sourceTimeRange.to,
        sourceQuery: 'from logs | limit 10',
        sourceTimeRange,
        isSampled: false,
      },
    });

    const callsAfterMount = embeddable.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Rerender chart' }));

    expect(embeddable).toHaveBeenCalledTimes(callsAfterMount);
  });
});
