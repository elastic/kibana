/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import * as hooks from './hooks';
import { useFetchMetricsData } from './hooks/use_fetch_metrics_data';

const useFetchMetricsDataMock = useFetchMetricsData as jest.MockedFunction<
  typeof useFetchMetricsData
>;
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { getFetchParamsMock, getFetch$Mock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ParsedMetricItem, Dimension, UnifiedMetricsGridProps } from '../../../types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import * as metricsExperienceStateProvider from './context/metrics_experience_state_provider';

jest.mock('./context/metrics_experience_state_provider');
jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
  }),
}));
jest.mock('./hooks', () => ({
  ...jest.requireActual('./hooks'),
  useMetricsGridFullScreen: jest.fn(),
  useMetricFieldsFilter: jest.fn(),
  useDiscoverFieldForBreakdown: jest.fn(),
}));
jest.mock('./hooks/use_fetch_metrics_data', () => ({
  useFetchMetricsData: jest.fn(),
}));
jest.mock('./metrics_experience_grid_content', () => ({
  MetricsExperienceGridContent: jest.fn(() => (
    <div data-test-subj="metricsExperienceGridContent" />
  )),
}));

/**
 * Mock EuiDelayRender to render immediately in tests.
 *
 * WITHOUT THIS MOCK: "renders the loading state when fields API is fetching" takes 521ms
 * WITH THIS MOCK: Same test takes ~15ms
 *
 * The EmptyState component uses EuiDelayRender with a 500ms delay to avoid
 * flashing loading states. In tests, this just slows things down.
 */
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiDelayRender: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const useMetricsExperienceStateMock =
  metricsExperienceStateProvider.useMetricsExperienceState as jest.MockedFunction<
    typeof metricsExperienceStateProvider.useMetricsExperienceState
  >;

const useMetricsGridFullScreenMock = hooks.useMetricsGridFullScreen as jest.MockedFunction<
  typeof hooks.useMetricsGridFullScreen
>;

const useMetricFieldsFilterMock = hooks.useMetricFieldsFilter as jest.MockedFunction<
  typeof hooks.useMetricFieldsFilter
>;

const useDiscoverFieldForBreakdownMock = hooks.useDiscoverFieldForBreakdown as jest.MockedFunction<
  typeof hooks.useDiscoverFieldForBreakdown
>;

const dimensions: Dimension[] = [{ name: 'foo' }, { name: 'qux' }];
const metricItems: ParsedMetricItem[] = [
  {
    metricName: 'field1',
    dimensionFields: [dimensions[0]],
    dataStream: 'metrics-*',
    units: [],
    metricTypes: [],
    fieldTypes: [],
  },
  {
    metricName: 'field2',
    dimensionFields: [dimensions[1]],
    dataStream: 'metrics-*',
    units: [],
    metricTypes: [],
    fieldTypes: [],
  },
];

describe('MetricsExperienceGrid', () => {
  let fetch$: UnifiedHistogramFetch$;
  let fetchParams: UnifiedHistogramFetchParams;
  let defaultProps: UnifiedMetricsGridProps;

  beforeEach(() => {
    jest.clearAllMocks();

    fetchParams = getFetchParamsMock({
      dataView: { getIndexPattern: () => 'metrics-*', isTimeBased: () => true } as any,
      filters: [],
      query: { esql: 'TS metrics-*' },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-15m', to: 'now' },
    });

    // Create new Subject for each test to prevent memory leaks
    fetch$ = getFetch$Mock(fetchParams);

    defaultProps = {
      renderToggleActions: () => <div data-test-subj="toggleActions" />,
      chartToolbarCss: { name: '', styles: '' },
      histogramCss: { name: '', styles: '' },
      fetchParams,
      actions: {
        openInNewTab: jest.fn(),
        updateESQLQuery: jest.fn(),
      },
      services: {
        fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
        data: {
          search: {
            search: jest.fn(),
          },
        },
        uiSettings: {},
      } as unknown as UnifiedHistogramServices,
      fetch$,
      isComponentVisible: true,
      profileId: 'test-profile-id',
    };

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onSearchTermChange: jest.fn(),
      onToggleFullscreen: jest.fn(),
      profileId: 'test-profile-id',
    });

    useFetchMetricsDataMock.mockReturnValue({
      metricItems,
      allDimensions: dimensions,
      activeDimensions: [],
      loading: false,
      error: null,
    });

    useMetricsGridFullScreenMock.mockReturnValue({
      metricsGridId: 'test-metrics-grid-id',
      styles: {
        'metricsGrid--fullScreen': 'mock-fullscreen-class',
        'metricsGrid--restrictBody': 'mock-restrict-body-class',
      },
    });

    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: metricItems });
    useDiscoverFieldForBreakdownMock.mockReturnValue(undefined);
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks and hanging tests
    fetch$.complete();
  });

  it('renders the toolbar', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('toggleActions')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceToolbarSearch')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceToolbarFullScreen')).toBeInTheDocument();
  });

  it('renders only the METRICS_INFO error state when fetch fails', () => {
    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: false,
      error: new Error('METRICS_INFO failed'),
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { getByTestId, queryByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsInfoError')).toBeInTheDocument();
    expect(getByTestId('metricsInfoErrorTitle')).toHaveTextContent('Unable to load visualization');
    expect(getByTestId('metricsInfoErrorDescription')).toHaveTextContent(
      'trouble retrieving the information needed for this visualization'
    );
    expect(queryByTestId('toggleActions')).not.toBeInTheDocument();
  });

  it('does not render the METRICS_INFO error state for AbortError (shows chart grid instead)', () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: false,
      error: abortError,
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { queryByTestId, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(queryByTestId('metricsInfoError')).not.toBeInTheDocument();
    expect(getByTestId('toggleActions')).toBeInTheDocument();
  });

  it('shows loading empty state instead of METRICS_INFO error while fetch is in progress', () => {
    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: true,
      error: new Error('stale error while refetching'),
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { queryByTestId, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(queryByTestId('metricsInfoError')).not.toBeInTheDocument();
    expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument();
  });

  it('shows and updates the search input when the search button is clicked', () => {
    jest.useFakeTimers();

    const onSearchTermChange = jest.fn();

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onSearchTermChange,
      onToggleFullscreen: jest.fn(),
      profileId: 'test-profile-id',
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    const inputButton = getByTestId('metricsExperienceToolbarSearch');

    act(() => {
      inputButton.click();
    });

    const input = getByTestId('metricsExperienceGridToolbarSearch');
    expect(input).toBeInTheDocument();

    act(() => {
      input.focus();
    });

    act(() => {
      fireEvent.change(input, { target: { value: 'cpu' } });
      jest.advanceTimersByTime(300);
    });

    expect(onSearchTermChange).toHaveBeenCalledWith('cpu');

    jest.useRealTimers();
  });

  it('toggles fullscreen mode when the fullscreen button is clicked', () => {
    const onToggleFullscreen = jest.fn();
    const isFullscreen = false;

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      isFullscreen,
      searchTerm: '',
      onSearchTermChange: jest.fn(),
      onToggleFullscreen,
      profileId: 'test-profile-id',
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceToolbarFullScreen')).toBeInTheDocument();

    const fullscreenButton = getByTestId('metricsExperienceToolbarFullScreen');

    act(() => {
      fullscreenButton.click();
    });

    expect(onToggleFullscreen).toHaveBeenCalled();
  });

  describe('wipe orphan dimensions on stream switch (#264957)', () => {
    // Smoke tests only: these assert the grid wires `useDimensionsWipe`
    // correctly (selection + breakdown callbacks reach Discover). The full
    // matrix of wipe scenarios lives in `use_dimensions_wipe.test.ts`.
    const hostName: Dimension = { name: 'host.name' };
    const environment: Dimension = { name: 'environment' };

    it('prunes selectedDimensions and proposes a default breakdown via onBreakdownFieldChange', () => {
      const onDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();

      useMetricsExperienceStateMock.mockReturnValue({
        currentPage: 0,
        selectedDimensions: [hostName, environment],
        onDimensionsChange,
        onPageChange: jest.fn(),
        isFullscreen: false,
        searchTerm: '',
        onSearchTermChange: jest.fn(),
        onToggleFullscreen: jest.fn(),
        profileId: 'test-profile-id',
      });

      // Stream's universe only has `host.name`; `environment` is mapped but
      // not emitted by this stream, so it must be wiped.
      useFetchMetricsDataMock.mockReturnValue({
        metricItems,
        allDimensions: [hostName],
        activeDimensions: [hostName],
        loading: false,
        error: null,
      });

      render(
        <MetricsExperienceGrid {...defaultProps} onBreakdownFieldChange={onBreakdownFieldChange} />,
        { wrapper: IntlProvider }
      );

      expect(onDimensionsChange).toHaveBeenCalledWith([hostName]);
      // Discover had no breakdown yet, so the wipe proposes the first
      // surviving dimension.
      expect(onBreakdownFieldChange).toHaveBeenCalledWith('host.name');
    });

    it('does not touch the breakdown when the current breakdownField survives the prune', () => {
      const onDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();

      useMetricsExperienceStateMock.mockReturnValue({
        currentPage: 0,
        selectedDimensions: [hostName, environment],
        onDimensionsChange,
        onPageChange: jest.fn(),
        isFullscreen: false,
        searchTerm: '',
        onSearchTermChange: jest.fn(),
        onToggleFullscreen: jest.fn(),
        profileId: 'test-profile-id',
      });

      useFetchMetricsDataMock.mockReturnValue({
        metricItems,
        allDimensions: [hostName],
        activeDimensions: [hostName],
        loading: false,
        error: null,
      });

      // Discover already breaks down by `host.name`, which survives the
      // prune; the wipe must leave it untouched.
      render(
        <MetricsExperienceGrid
          {...defaultProps}
          breakdownField="host.name"
          onBreakdownFieldChange={onBreakdownFieldChange}
        />,
        { wrapper: IntlProvider }
      );

      expect(onDimensionsChange).toHaveBeenCalledWith([hostName]);
      expect(onBreakdownFieldChange).not.toHaveBeenCalled();
    });
  });
});
