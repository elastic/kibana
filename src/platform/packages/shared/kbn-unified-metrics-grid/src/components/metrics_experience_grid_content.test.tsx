/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { MetricsExperienceGridContentProps } from './metrics_experience_grid_content';
import { MetricsExperienceGridContent } from './metrics_experience_grid_content';
import * as hooks from '../hooks';
import type { UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Subject } from 'rxjs';
import type { MetricField, Dimension } from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import * as metricsExperienceStateProvider from '../context/metrics_experience_state_provider';

jest.mock('../context/metrics_experience_state_provider');
jest.mock('../hooks');
jest.mock('./chart', () => ({
  Chart: jest.fn(() => <div data-test-subj="metric-chart" />),
}));

/**
 * Mock EuiDelayRender to render immediately in tests.
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

const useFilteredMetricFieldsMock = hooks.useFilteredMetricFields as jest.MockedFunction<
  typeof hooks.useFilteredMetricFields
>;

const usePaginationMock = hooks.usePagination as jest.MockedFunction<typeof hooks.usePagination>;

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
  },
  {
    name: 'field2',
    dimensions: [dimensions[1]],
    index: 'metrics-*',
    type: 'long',
  },
];

describe('MetricsExperienceGridContent', () => {
  let input$: Subject<UnifiedHistogramInputMessage>;
  let defaultProps: MetricsExperienceGridContentProps;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create new Subject for each test to prevent memory leaks
    input$ = new Subject<UnifiedHistogramInputMessage>();

    defaultProps = {
      fields: allFields,
      timeRange: { from: 'now-15m', to: 'now' },
      services: {} as any,
      input$,
      requestParams: {
        getTimeRange: () => ({ from: 'now-15m', to: 'now' }),
        filters: [],
        query: { esql: 'FROM metrics-*' },
        esqlVariables: [],
        relativeTimeRange: { from: 'now-15m', to: 'now' },
        updateTimeRange: () => {},
      },
      onBrushEnd: jest.fn(),
      onFilter: jest.fn(),
      searchSessionId: 'test-session-id',
      abortController: new AbortController(),
      histogramCss: { name: '', styles: '' },
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

    useFilteredMetricFieldsMock.mockReturnValue({
      fields: allFields,
      filters: {},
      isLoading: false,
    });

    usePaginationMock.mockReturnValue({
      currentPageItems: [allFields[0]],
      totalPages: 1,
      totalCount: 1,
    });
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks and hanging tests
    input$.complete();
  });

  it('renders the grid with paginated fields', () => {
    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceRendered')).toBeInTheDocument();
  });

  it('renders the no data state when filtered/paginated fields returns no fields', () => {
    useFilteredMetricFieldsMock.mockReturnValue({
      fields: [],
      filters: {},
      isLoading: false,
    });

    usePaginationMock.mockReturnValue({
      currentPageItems: [],
      totalPages: 0,
      totalCount: 0,
    });

    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
  });

  it('filters fields by search term and respects page size', () => {
    // 20 fields, 10 with "cpu" in the name
    const allFieldsSomeWithCpu = Array.from({ length: 20 }, (_, i) => ({
      name: i % 2 === 0 ? `cpu_field_${i}` : `mem_field_${i}`,
      dimensions: [dimensions[0]],
      index: 'metrics-*',
      type: 'long' as const,
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
      onSearchTermChange: jest.fn(),
      onToggleFullscreen: jest.fn(),
    });

    const cpuFields = allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu'));

    useFilteredMetricFieldsMock.mockReturnValue({
      fields: cpuFields,
      filters: {},
      isLoading: false,
    });

    usePaginationMock.mockReturnValue({
      currentPageItems: cpuFields.slice(0, 5),
      totalPages: 2,
      totalCount: cpuFields.length,
    });

    const { getByText } = render(
      <MetricsExperienceGridContent {...defaultProps} fields={allFieldsSomeWithCpu} />,
      {
        wrapper: IntlProvider,
      }
    );

    expect(getByText('10 metrics')).toBeInTheDocument();
  });

  it('displays loading state when filtering is in progress', () => {
    useFilteredMetricFieldsMock.mockReturnValue({
      fields: allFields,
      filters: {},
      isLoading: true,
    });

    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    // Should still render the grid but show loading indicator
    expect(getByTestId('metricsExperienceRendered')).toBeInTheDocument();
  });

  it('renders the <MetricsGrid />', () => {
    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('unifiedMetricsExperienceGrid')).toBeInTheDocument();
  });

  it('renders the technical preview badge', () => {
    const { getByText, getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceTechnicalPreviewBadge')).toBeInTheDocument();
    expect(getByText('Technical preview')).toBeInTheDocument();
  });

  it('renders the loading state when Discover is reloading', () => {
    const { getByTestId } = render(
      <MetricsExperienceGridContent {...defaultProps} isDiscoverLoading />,
      {
        wrapper: IntlProvider,
      }
    );

    expect(getByTestId('metricsExperienceProgressBar')).toBeInTheDocument();
  });
});
