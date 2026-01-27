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
import type { ReactElement } from 'react';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramFetchStatus } from '../../types';
import React from 'react';
import { act, screen } from '@testing-library/react';
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
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import userEvent from '@testing-library/user-event';

jest.mock('./hooks/use_edit_visualization', () => ({
  useEditVisualization: () => mockUseEditVisualization,
}));

let mockUseEditVisualization: jest.Mock | undefined = jest.fn();
const mockedSearchSourceInstanceMockFetch$ = jest.mocked(searchSourceInstanceMock.fetch$);

interface MountComponentProps {
  customToggle?: ReactElement;
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
}

const mountComponent = async (mountProps: MountComponentProps = {}) => {
  const {
    customToggle,
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
    isChartAvailable: checkChartAvailability({ chart, dataView, isPlainRecord }),
    renderCustomChartToggleActions: customToggle ? () => customToggle : undefined,
    fetch$: getFetch$Mock(),
    fetchParams,
    dataLoading$: undefined,
    lensAdapters: undefined,
  };

  renderWithI18n(<UnifiedHistogramChart {...props} />);

  act(() => {
    props.fetch$?.next({
      fetchParams: props.fetchParams,
      lensVisServiceState: props.lensVisServiceState,
    });
  });

  return { mockOnEditVisualization: mockUseEditVisualization };
};

describe('Chart', () => {
  test('render when chart is undefined', async () => {
    await mountComponent({ noChart: true });

    expect(screen.getByText('Show chart')).toBeVisible();
  });

  test('should render a custom toggle when provided', async () => {
    await mountComponent({
      customToggle: <span data-test-subj="custom-toggle" />,
    });

    expect(screen.getByTestId('custom-toggle')).toBeVisible();
    expect(screen.queryByText('Show chart')).not.toBeInTheDocument();
  });

  test('should not render when custom toggle is provided and chart is hidden', async () => {
    await mountComponent({
      customToggle: <span data-test-subj="custom-toggle" />,
      chartHidden: true,
    });

    expect(screen.getByTestId('unifiedHistogramChartPanelHidden')).toBeVisible();
    expect(screen.queryByTestId('custom-toggle')).not.toBeInTheDocument();
  });

  test('render when chart is defined and onEditVisualization is undefined', async () => {
    await mountComponent({ mockEditVisualization: undefined });

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.queryByText('Edit visualization')).not.toBeInTheDocument();
  });

  test('render when chart is defined and onEditVisualization is defined', async () => {
    await mountComponent();

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.getByText('Edit visualization')).toBeVisible();
  });

  test('render when chart.hidden is true', async () => {
    await mountComponent({ chartHidden: true });

    expect(screen.getByText('Show chart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
  });

  test('render when chart.hidden is false', async () => {
    await mountComponent({ chartHidden: false });

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
  });

  test('should render when is text based, transformational and non-time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
      dataView: dataViewMock,
      isTransformationalESQL: true,
    });

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByText('Edit visualization')).toBeVisible();
    expect(screen.getByText('Save visualization')).toBeVisible();
  });

  test('should not render when is text based, non-transformational and non-time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
      dataView: dataViewMock,
      isTransformationalESQL: false,
    });

    expect(screen.getByText('Show chart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit visualization')).not.toBeInTheDocument();
    expect(screen.queryByText('Save visualization')).not.toBeInTheDocument();
  });

  test('should not render when is text based, non-transformational, non-time-based and suggestions are available', async () => {
    await mountComponent({
      allSuggestions: allSuggestionsMock,
      isPlainRecord: true,
      dataView: dataViewMock,
      isTransformationalESQL: false,
    });

    expect(screen.getByText('Show chart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit visualization')).not.toBeInTheDocument();
    expect(screen.queryByText('Save visualization')).not.toBeInTheDocument();
  });

  test('should render when is text based, non-transformational and time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
      isTransformationalESQL: false,
    });

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByText('Edit visualization')).toBeVisible();
    expect(screen.getByText('Save visualization')).toBeVisible();
  });

  test('should render when is text based, transformational and time-based', async () => {
    await mountComponent({
      isPlainRecord: true,
      isTransformationalESQL: true,
    });

    expect(screen.getByText('Hide chart')).toBeVisible();
    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.getByText('Edit visualization')).toBeVisible();
    expect(screen.getByText('Save visualization')).toBeVisible();
  });

  test('should not render when is text based, transformational and no suggestions available', async () => {
    await mountComponent({
      allSuggestions: [],
      isPlainRecord: true,
      isTransformationalESQL: true,
    });

    expect(screen.getByText('Show chart')).toBeVisible();
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit visualization')).not.toBeInTheDocument();
    expect(screen.queryByText('Save visualization')).not.toBeInTheDocument();
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

    await user.click(screen.getByText('Edit visualization'));

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
    expect(screen.queryByText('Save visualization')).not.toBeInTheDocument();
  });

  it('should not render the save button when the dashboard save by value permissions are false', async () => {
    await mountComponent({
      allSuggestions: allSuggestionsMock,
      hasDashboardPermissions: false,
    });

    expect(screen.getByTestId('unifiedHistogramChart')).toBeVisible();
    expect(screen.queryByText('Save visualization')).not.toBeInTheDocument();
  });
});
