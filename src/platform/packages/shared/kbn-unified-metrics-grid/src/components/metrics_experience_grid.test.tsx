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
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import * as hooks from '../hooks';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import type {
  ChartSectionProps,
  UnifiedHistogramInputMessage,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Subject } from 'rxjs';
import type { MetricField, Dimension } from '@kbn/metrics-experience-plugin/common/types';

jest.mock('../store/hooks');
jest.mock('../hooks');
jest.mock('./chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="metric-chart" />),
}));

const useMetricsGridStateMock = hooks.useMetricsGridState as jest.MockedFunction<
  typeof hooks.useMetricsGridState
>;
const useMetricFieldsQueryMock = hooks.useMetricFieldsQuery as jest.MockedFunction<
  typeof hooks.useMetricFieldsQuery
>;
const useDimensionsQueryMock = hooks.useDimensionsQuery as jest.MockedFunction<
  typeof hooks.useDimensionsQuery
>;

const usePaginatedFieldsMock = hooks.usePaginatedFields as jest.MockedFunction<
  typeof hooks.usePaginatedFields
>;

const input$ = new Subject<UnifiedHistogramInputMessage>();

const dimensions: Dimension[] = [
  { name: 'foo', type: 'keyword', description: 'some description' },
  { name: 'qux', type: 'keyword', description: 'some description' },
];
const dimensionNames = dimensions.map((d) => d.name);
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
  const defaultProps: ChartSectionProps = {
    dataView: { getIndexPattern: () => 'metrics-*' } as ChartSectionProps['dataView'],
    renderToggleActions: () => <div data-test-subj="toggleActions" />,
    chartToolbarCss: { name: '', styles: '' },
    histogramCss: { name: '', styles: '' },
    requestParams: {
      getTimeRange: () => ({ from: 'now-15m', to: 'now' }),
      filters: [],
      query: { esql: 'FROM metrics-*' },
      relativeTimeRange: { from: 'now-15m', to: 'now' },
      updateTimeRange: () => {},
    },
    services: {} as UnifiedHistogramServices,
    input$,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useMetricsGridStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      onClearValues: jest.fn(),
      onClearAllDimensions: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onClearSearchTerm: () => {},
      onSearchTermChange: () => {},
      onToggleFullscreen: () => {},
    });

    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 1,
      allFields,
      filteredFieldsBySearch: [allFields[0]],
      currentPageFields: [allFields[0]],
      dimensions: dimensionNames,
    });

    useDimensionsQueryMock.mockReturnValue({
      data: dimensions,
    } as unknown as ReturnType<typeof hooks.useDimensionsQuery>);

    useMetricFieldsQueryMock.mockReturnValue({
      data: allFields,
      status: 'success',
      isLoading: false,
    });
  });

  it('renders the <MetricsGrid />', async () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    await waitFor(() => expect(getByTestId('unifiedMetricsExperienceGrid')).toBeInTheDocument());
  });

  it('renders the loading state', async () => {
    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'loading',
      isLoading: true,
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    await waitFor(() => expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument());
  });

  it('renders the no data state with the header when Fields API returns no data', () => {
    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'success',
      isLoading: false,
    });
    const { queryByTestId, getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(queryByTestId('toggleActions')).toBeInTheDocument();
    expect(queryByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
  });

  it('renders the no data state covering only the grid section when paginated fields returns no fields', async () => {
    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 0,
      allFields: [],
      currentPageFields: [],
      filteredFieldsBySearch: [],
      dimensions: dimensionNames,
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    await waitFor(() => {
      expect(getByTestId('toggleActions')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
    });
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

  it('render <ValuesSelector /> when dimensions are selected', async () => {
    useMetricsGridStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: ['foo'],
      valueFilters: [`foo${FIELD_VALUE_SEPARATOR}bar`],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      onClearValues: jest.fn(),
      onClearAllDimensions: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onClearSearchTerm: () => {},
      onSearchTermChange: () => {},
      onToggleFullscreen: () => {},
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    await waitFor(() =>
      expect(getByTestId('metricsExperienceValuesSelectorButton')).toBeInTheDocument()
    );
  });

  it('shows and updates the search input when the search button is clicked', async () => {
    const onSearchTermChange = jest.fn();

    useMetricsGridStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      onClearValues: jest.fn(),
      onClearAllDimensions: jest.fn(),
      isFullscreen: false,
      searchTerm: '',
      onClearSearchTerm: jest.fn(),
      onSearchTermChange,
      onToggleFullscreen: jest.fn(),
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    const inputButton = getByTestId('metricsExperienceToolbarSearch');
    expect(inputButton).toBeInTheDocument();
    await inputButton.click();

    const input = getByTestId('metricsExperienceToolbarSearchInputInput');
    expect(input).toBeInTheDocument();

    input.focus();
    fireEvent.change(input, { target: { value: 'cpu' } });

    expect(onSearchTermChange).toHaveBeenCalledWith('cpu');
  });

  it('toggles fullscreen mode when the fullscreen button is clicked', async () => {
    const onToggleFullscreen = jest.fn();
    const isFullscreen = false;

    useMetricsGridStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      onClearValues: jest.fn(),
      onClearAllDimensions: jest.fn(),
      isFullscreen,
      searchTerm: '',
      onClearSearchTerm: jest.fn(),
      onSearchTermChange: jest.fn(),
      onToggleFullscreen,
    });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    const fullscreenButton = getByTestId('metricsExperienceToolbarFullScreen');
    expect(fullscreenButton).toBeInTheDocument();
    fireEvent.click(fullscreenButton);

    expect(onToggleFullscreen).toHaveBeenCalled();
  });

  it('filters fields by search term and respects page size', async () => {
    const onSearchTermChange = jest.fn();

    // 20 fields, 10 with "cpu" in the name
    const allFieldsSomeWithCpu = Array.from({ length: 20 }, (_, i) => ({
      name: i % 2 === 0 ? `cpu_field_${i}` : `mem_field_${i}`,
      dimensions: [dimensions[0]],
      index: 'metrics-*',
      type: 'long',
      noData: false,
    }));

    useMetricsGridStateMock.mockReturnValue({
      currentPage: 0,
      dimensions: [],
      valueFilters: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      onValuesChange: jest.fn(),
      onClearValues: jest.fn(),
      onClearAllDimensions: jest.fn(),
      isFullscreen: false,
      searchTerm: 'cpu',
      onClearSearchTerm: jest.fn(),
      onSearchTermChange,
      onToggleFullscreen: jest.fn(),
    });

    usePaginatedFieldsMock.mockReturnValue({
      totalPages: 2,
      allFields: allFieldsSomeWithCpu,
      filteredFieldsBySearch: allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu')),
      currentPageFields: allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu')).slice(0, 5),
      dimensions: dimensionNames,
    });

    const { getByText } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByText('10 metrics')).toBeInTheDocument();
  });
});
