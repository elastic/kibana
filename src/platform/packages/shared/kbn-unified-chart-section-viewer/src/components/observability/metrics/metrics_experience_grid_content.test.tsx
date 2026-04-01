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
import * as hooks from './hooks';
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetchParams,
} from '@kbn/unified-histogram/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ParsedMetricItem, MetricUnit, Dimension } from '../../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import * as metricsExperienceStateProvider from './context/metrics_experience_state_provider';
import { getFetch$Mock, getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';

jest.mock('./context/metrics_experience_state_provider');
jest.mock('./hooks');

const ChartMock = jest.fn(() => <div data-test-subj="metric-chart" />);
jest.mock('../../chart', () => ({
  Chart: (props: any) => ChartMock(props),
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

const usePaginationMock = hooks.usePagination as jest.MockedFunction<typeof hooks.usePagination>;

const dimensions: Dimension[] = [{ name: 'foo' }, { name: 'qux' }];

const metricItems: ParsedMetricItem[] = [
  {
    metricName: 'field1',
    dataStream: 'metrics-*',
    units: ['ms'],
    metricTypes: ['counter'],
    fieldTypes: [ES_FIELD_TYPES.LONG],
    dimensionFields: [dimensions[0]],
  },
  {
    metricName: 'field2',
    dataStream: 'metrics-*',
    units: ['ms'],
    metricTypes: ['counter'],
    fieldTypes: [ES_FIELD_TYPES.LONG],
    dimensionFields: [dimensions[1]],
  },
];

describe('MetricsExperienceGridContent', () => {
  let fetch$: UnifiedHistogramFetch$;
  let fetchParams: UnifiedHistogramFetchParams;
  let defaultProps: MetricsExperienceGridContentProps;

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
      metricItems,
      services: {} as any,
      discoverFetch$: fetch$,
      fetchParams,
      onBrushEnd: jest.fn(),
      onFilter: jest.fn(),
      actions: {
        openInNewTab: jest.fn(),
        updateESQLQuery: jest.fn(),
      },
      histogramCss: { name: '', styles: '' },
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

    usePaginationMock.mockReturnValue({
      currentPageItems: [metricItems[0]],
      totalPages: 1,
      totalCount: 1,
    });
  });

  afterEach(() => {
    // Complete the Subject to prevent memory leaks and hanging tests
    fetch$.complete();
  });

  it('renders the grid with paginated fields', () => {
    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceRendered')).toBeInTheDocument();
  });

  it('renders the no data state when filtered/paginated fields returns no fields', () => {
    usePaginationMock.mockReturnValue({
      currentPageItems: [],
      totalPages: 0,
      totalCount: 0,
    });

    const { getByTestId } = render(
      <MetricsExperienceGridContent {...defaultProps} metricItems={[]} />,
      {
        wrapper: IntlProvider,
      }
    );

    expect(getByTestId('metricsExperienceNoData')).toBeInTheDocument();
  });

  it('filters fields by search term and respects page size', () => {
    // 20 fields, 10 with "cpu" in the name
    const allFieldsSomeWithCpu = Array.from({ length: 20 }, (_, i) => ({
      metricName: i % 2 === 0 ? `cpu_field_${i}` : `mem_field_${i}`,
      dimensionFields: [dimensions[0]],
      dataStream: 'metrics-*',
      units: ['ms'] as MetricUnit[],
      metricTypes: ['counter'] as MappingTimeSeriesMetricType[],
      fieldTypes: [ES_FIELD_TYPES.LONG] as ES_FIELD_TYPES[],
    }));

    useMetricsExperienceStateMock.mockReturnValue({
      currentPage: 0,
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      onPageChange: jest.fn(),
      isFullscreen: false,
      searchTerm: 'cpu',
      onSearchTermChange: jest.fn(),
      onToggleFullscreen: jest.fn(),
    });

    const cpuMetricItems = allFieldsSomeWithCpu.filter((f) => f.metricName.includes('cpu'));

    usePaginationMock.mockReturnValue({
      currentPageItems: cpuMetricItems.slice(0, 5),
      totalPages: 2,
      totalCount: cpuMetricItems.length,
    });

    const { getByText } = render(
      <MetricsExperienceGridContent {...defaultProps} metricItems={allFieldsSomeWithCpu} />,
      {
        wrapper: IntlProvider,
      }
    );

    expect(getByText('10 metrics')).toBeInTheDocument();
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

  it('passes counter short range warning to counter metrics when time range is short', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T12:00:00Z'));

    const shortRangeFetchParams = getFetchParamsMock({
      dataView: { getIndexPattern: () => 'metrics-*', isTimeBased: () => true } as any,
      filters: [],
      query: { esql: 'FROM metrics-*' },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-15m', to: 'now' },
      timeRange: { from: 'now-15m', to: 'now' },
    });

    const counterMetric: ParsedMetricItem = {
      metricName: 'system.cpu.time',
      dataStream: 'metrics-*',
      units: ['ms'],
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [],
    };

    usePaginationMock.mockReturnValue({
      currentPageItems: [counterMetric],
      totalPages: 1,
      totalCount: 1,
    });

    render(
      <MetricsExperienceGridContent
        {...defaultProps}
        metricItems={[counterMetric]}
        fetchParams={shortRangeFetchParams}
      />,
      { wrapper: IntlProvider }
    );

    expect(ChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessages: expect.arrayContaining([
          expect.objectContaining({
            uniqueId: 'metrics-experience-counter-short-range-warning',
            severity: 'warning',
          }),
        ]),
      })
    );

    jest.useRealTimers();
  });

  it('does not pass counter warning when time range is long', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T12:00:00Z'));

    const longRangeFetchParams = getFetchParamsMock({
      dataView: { getIndexPattern: () => 'metrics-*', isTimeBased: () => true } as any,
      filters: [],
      query: { esql: 'FROM metrics-*' },
      esqlVariables: [],
      relativeTimeRange: { from: 'now-24h', to: 'now' },
      timeRange: { from: 'now-24h', to: 'now' },
    });

    const counterMetric: ParsedMetricItem = {
      metricName: 'system.cpu.time',
      dataStream: 'metrics-*',
      units: ['ms'],
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [],
    };

    usePaginationMock.mockReturnValue({
      currentPageItems: [counterMetric],
      totalPages: 1,
      totalCount: 1,
    });

    render(
      <MetricsExperienceGridContent
        {...defaultProps}
        metricItems={[counterMetric]}
        fetchParams={longRangeFetchParams}
      />,
      { wrapper: IntlProvider }
    );

    expect(ChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessages: undefined,
      })
    );

    jest.useRealTimers();
  });
});
