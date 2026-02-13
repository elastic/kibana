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
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { getFetchParamsMock, getFetch$Mock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { MetricField, Dimension, UnifiedMetricsGridProps } from '../../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import * as metricsExperienceStateProvider from './context/metrics_experience_state_provider';
import * as metricsExperienceFieldsCapsProvider from './context/metrics_experience_fields_provider';

jest.mock('./context/metrics_experience_state_provider');
jest.mock('./context/metrics_experience_fields_provider');
jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
  }),
}));
jest.mock('./hooks');
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

const useMetricFieldsContextMock =
  metricsExperienceFieldsCapsProvider.useMetricsExperienceFieldsContext as jest.MockedFunction<
    typeof metricsExperienceFieldsCapsProvider.useMetricsExperienceFieldsContext
  >;

const useMetricFieldsMock = hooks.useMetricFields as jest.MockedFunction<
  typeof hooks.useMetricFields
>;

const dimensions: Dimension[] = [
  { name: 'foo', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'qux', type: ES_FIELD_TYPES.KEYWORD },
];
const allFields: MetricField[] = [
  {
    name: 'field1',
    dimensions: [dimensions[0]],
    index: 'metrics-*',
    type: ES_FIELD_TYPES.LONG,
  },
  {
    name: 'field2',
    dimensions: [dimensions[1]],
    index: 'metrics-*',
    type: ES_FIELD_TYPES.LONG,
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
      query: { esql: 'FROM metrics-*' },
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
      } as unknown as UnifiedHistogramServices,
      fetch$,
      isComponentVisible: true,
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
    });

    useMetricsGridFullScreenMock.mockReturnValue({
      metricsGridId: 'test-metrics-grid-id',
      metricsGridWrapper: null,
      setMetricsGridWrapper: jest.fn(),
      styles: {
        'metricsGrid--fullScreen': 'mock-fullscreen-class',
        'metricsGrid--restrictBody': 'mock-restrict-body-class',
      },
    });

    useMetricFieldsContextMock.mockReturnValue({
      metricFields: [],
      dimensions: [],
      getSampleRow: jest.fn(() => undefined),
      whereStatements: [],
    });

    useMetricFieldsMock.mockReturnValue({
      allMetricFields: allFields,
      visibleMetricFields: allFields,
      dimensions,
    });
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks and hanging tests
    fetch$.complete();
  });

  it('renders the loading state when fields API is fetching', () => {
    useMetricFieldsContextMock.mockReturnValue({
      metricFields: [],
      dimensions: [],
      getSampleRow: jest.fn(() => undefined),
      whereStatements: [],
    });

    useMetricFieldsMock.mockReturnValue({
      allMetricFields: [],
      visibleMetricFields: [],
      dimensions: [],
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} isChartLoading />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument();
  });

  it('renders the no data state covering the entire container when Fields API returns no data', () => {
    useMetricFieldsContextMock.mockReturnValue({
      metricFields: [],
      dimensions: [],
      getSampleRow: jest.fn(() => undefined),
      whereStatements: [],
    });

    useMetricFieldsMock.mockReturnValue({
      allMetricFields: [],
      visibleMetricFields: [],
      dimensions: [],
    });

    const { queryByTestId, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(queryByTestId('toggleActions')).not.toBeInTheDocument();
    expect(queryByTestId('metricsExperienceBreakdownSelectorButton')).not.toBeInTheDocument();
    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
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
});
