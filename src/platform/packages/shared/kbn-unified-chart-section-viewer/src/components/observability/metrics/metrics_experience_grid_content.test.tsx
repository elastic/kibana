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
import type { MetricField, Dimension } from '../../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import * as metricsExperienceStateProvider from './context/metrics_experience_state_provider';
import { getFetch$Mock, getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';

jest.mock('./context/metrics_experience_state_provider');
jest.mock('./hooks');
jest.mock('../../chart', () => ({
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
    type: ES_FIELD_TYPES.LONG,
  },
  {
    name: 'field2',
    dimensions: [dimensions[1]],
    index: 'metrics-*',
    type: ES_FIELD_TYPES.LONG,
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
      fields: allFields,
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
      currentPageItems: [allFields[0]],
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

    const { getByTestId } = render(<MetricsExperienceGridContent {...defaultProps} fields={[]} />, {
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
      type: ES_FIELD_TYPES.LONG,
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

    const cpuFields = allFieldsSomeWithCpu.filter((f) => f.name.includes('cpu'));

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
