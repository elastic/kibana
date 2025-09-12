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
      allFields: [],
      currentPageFields: [],
      dimensions: [],
    });

    useDimensionsQueryMock.mockReturnValue({
      data: [
        {
          field: 'foo',
          value: 'bar',
        },
        {
          field: 'qux',
          value: 'baz',
        },
      ],
    } as unknown as ReturnType<typeof hooks.useDimensionsQuery>);

    useMetricFieldsQueryMock.mockReturnValue({
      data: [
        {
          name: 'field1',
          dimensions: [{ name: 'foo', type: 'number', description: 'some description' }],
          index: 'metrics-*',
          type: 'number',
          noData: false,
        },
        {
          name: 'field2',
          dimensions: [{ name: 'foo', type: 'number', description: 'some description' }],
          index: 'metrics-*',
          type: 'number',
          noData: false,
        },
      ],
      status: 'success',
      isLoading: false,
    });
  });

  it('renders the <MetricsGrid />', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    waitFor(() => expect(getByTestId('unifiedMetricsExperienceGrid')).toBeInTheDocument());
  });

  it('renders the loading state', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'loading',
      isLoading: true,
    });

    waitFor(() => expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument());
  });

  it('renders the no data state', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    useMetricFieldsQueryMock.mockReturnValue({
      data: [],
      status: 'loading',
      isLoading: false,
    });

    waitFor(() => expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument());
  });

  it('renders the toolbar', () => {
    const { getByTestId, queryByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    waitFor(() => {
      expect(getByTestId('toggleActions')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceBreakdownSelectorButton')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceToolbarSearch')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceToolbarFullScreen')).toBeInTheDocument();
      expect(queryByTestId('metricsExperienceValuesSelectorButton')).not.toBeInTheDocument();
    });
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

    waitFor(() => expect(getByTestId('metricsExperienceValuesSelectorButton')).toBeInTheDocument());
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
});
