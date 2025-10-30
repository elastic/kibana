/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render } from '@testing-library/react';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import * as hooks from '../hooks';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';
import type {
  ChartSectionProps,
  UnifiedHistogramInputMessage,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Subject } from 'rxjs';
import type { MetricField, Dimension } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import * as metricsExperienceStateProvider from '../context/metrics_experience_state_provider';

jest.mock('../context/metrics_experience_state_provider');
jest.mock('../hooks');
jest.mock('./chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="metric-chart" />),
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

const useMetricFieldsQueryMock = hooks.useMetricFieldsQuery as jest.MockedFunction<
  typeof hooks.useMetricFieldsQuery
>;
const useDimensionsQueryMock = hooks.useDimensionsQuery as jest.MockedFunction<
  typeof hooks.useDimensionsQuery
>;
const useMetricsGridFullScreenMock = hooks.useMetricsGridFullScreen as jest.MockedFunction<
  typeof hooks.useMetricsGridFullScreen
>;

const usePaginatedFieldsMock = hooks.usePaginatedFields as jest.MockedFunction<
  typeof hooks.usePaginatedFields
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
    type: 'long',
    noData: false,
  },
  {
    name: 'field2',
    dimensions: [dimensions[1]],
    index: 'metrics-*',
    type: 'long',
    noData: false,
  },
];

describe('MetricsExperienceGrid', () => {
  let input$: Subject<UnifiedHistogramInputMessage>;
  let defaultProps: ChartSectionProps;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create new Subject for each test to prevent memory leaks
    input$ = new Subject<UnifiedHistogramInputMessage>();

    defaultProps = {
      dataView: { getIndexPattern: () => 'metrics-*' } as ChartSectionProps['dataView'],
      renderToggleActions: () => <div data-test-subj="toggleActions" />,
      chartToolbarCss: { name: '', styles: '' },
      histogramCss: { name: '', styles: '' },
      requestParams: {
        getTimeRange: () => ({ from: 'now-15m', to: 'now' }),
        filters: [],
        query: { esql: 'FROM metrics-*' },
        esqlVariables: [],
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        updateTimeRange: () => {},
      },
      services: {
        fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
      } as unknown as UnifiedHistogramServices,
      input$,
      isComponentVisible: true,
    };

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onSearchTermChange: jest.fn(),
      onToggleFullscreen: jest.fn(),
    });

    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 1,
      filteredFieldsCount: 1,
      currentPageFields: [allFields[0]],
    });

    useDimensionsQueryMock.mockReturnValue({
      data: dimensions,
    } as unknown as ReturnType<typeof hooks.useDimensionsQuery>);

    useMetricFieldsQueryMock.mockReturnValue({
      data: allFields,
      status: 'success',
      isFetching: false,
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
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks and hanging tests
    input$.complete();
  });

  it('renders the <MetricsGrid />', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('unifiedMetricsExperienceGrid')).toBeInTheDocument();
  });

  it('renders the loading state when fields API is fetching', () => {
    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'loading',
      isFetching: true,
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument();
  });

  it('renders the loading state when Discover is reloading', () => {
    const props = { ...defaultProps, isChartLoading: true };

    const { getByTestId } = render(<MetricsExperienceGrid {...props} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument();
  });

  it('renders the no data state covering the entire container when Fields API returns no data', () => {
    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'success',
      isFetching: false,
    });
    const { queryByTestId, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(queryByTestId('toggleActions')).not.toBeInTheDocument();
    expect(queryByTestId('metricsExperienceBreakdownSelectorButton')).not.toBeInTheDocument();
    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
  });

  it('renders the no data state covering only the grid section when paginated fields returns no fields', () => {
    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 0,
      currentPageFields: [],
      filteredFieldsCount: 0,
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('toggleActions')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
  });

  it('renders the toolbar', () => {
    const { getByTestId, queryByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('toggleActions')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceToolbarSearch')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceToolbarFullScreen')).toBeInTheDocument();
    expect(queryByTestId('metricsExperienceValuesSelectorButton')).not.toBeInTheDocument();
  });

  it('render <ValuesSelector /> when dimensions are selected', () => {
    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: ['foo'],
      valueFilters: [`foo${FIELD_VALUE_SEPARATOR}bar`],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onSearchTermChange: jest.fn(),
      onToggleFullscreen: jest.fn(),
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceValuesSelectorButton')).toBeInTheDocument();
  });

  it('shows and updates the search input when the search button is clicked', () => {
    jest.useFakeTimers();

    const onSearchTermChange = jest.fn();

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
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
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
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

  it('filters fields by search term and respects page size', () => {
    const onSearchTermChange = jest.fn();

    // 20 fields, 10 with "cpu" in the name
    const allFieldsSomeWithCpu = Array.from({ length: 20 }, (_, i) => ({
      name: i % 2 === 0 ? `cpu_field_${i}` : `mem_field_${i}`,
      dimensions: [dimensions[0]],
      index: 'metrics-*',
      type: 'long',
      noData: false,
    }));

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      isFullscreen: false,
      searchTerm: 'cpu',
      onSearchTermChange,
      onToggleFullscreen: jest.fn(),
    });

    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 2,
      filteredFieldsCount: allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu')).length,
      currentPageFields: allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu')).slice(0, 5),
    });

    const { getByText } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByText('10 metrics')).toBeInTheDocument();
  });

  it('renders the technical preview badge', () => {
    const { getByText, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceTechnicalPreviewBadge')).toBeInTheDocument();
    expect(getByText('Technical preview')).toBeInTheDocument();
  });
});
