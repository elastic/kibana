/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
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
import { EsqlResponseError } from '../../../common/errors/esql_response_error';
import {
  ExternalServicesProvider,
  type ExternalServices,
} from '../../../context/external_services';
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

// Simplified ToolbarSelector so dimension options are clickable in JSDOM without
// needing EUI portals or keyboard simulation.
jest.mock('@kbn/shared-ux-toolbar-selector', () => {
  const actual = jest.requireActual('@kbn/shared-ux-toolbar-selector');
  return {
    ...actual,
    ToolbarSelector: ({
      options,
      onChange,
      buttonLabel,
      'data-test-subj': dataTestSubj,
      singleSelection,
    }: {
      options: any[];
      onChange?: (option: any) => void;
      buttonLabel: React.ReactNode;
      'data-test-subj'?: string;
      singleSelection?: boolean;
    }) => {
      const handleOptionClick = (clickedOption: any) => {
        if (clickedOption.disabled) return;
        if (singleSelection) {
          onChange?.(clickedOption);
          return;
        }
        const wasChecked = clickedOption.checked === 'on';
        const nextSelected = options
          .filter((opt) => {
            if (opt.value === clickedOption.value) return !wasChecked;
            return opt.checked === 'on';
          })
          .map((opt) => ({ ...opt, checked: 'on' }));
        onChange?.(nextSelected);
      };
      return (
        <div data-test-subj={dataTestSubj}>
          <div data-test-subj={`${dataTestSubj}Button`}>{buttonLabel}</div>
          <div data-test-subj={`${dataTestSubj}Popover`}>
            {options.map((option) => (
              <div
                key={option.key ?? option.value}
                data-test-subj={`${dataTestSubj}Option-${option.value}`}
                data-checked={option.checked}
                onClick={() => handleOptionClick(option)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOptionClick(option);
                  }
                }}
                role="option"
                aria-selected={option.checked === 'on'}
                tabIndex={option.disabled ? -1 : 0}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      );
    },
  };
});

// Make lodash debounce synchronous so dimension-change callbacks fire in act().
jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    debounce: (fn: any) => {
      const debounced = (...args: any[]) => fn(...args);
      debounced.cancel = jest.fn();
      return debounced;
    },
  };
});

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

const TestWrapper = ({
  children,
  externalServices,
}: {
  children: React.ReactNode;
  externalServices?: ExternalServices;
}) => (
  <EuiProvider highContrastMode={false}>
    <IntlProvider locale="en">
      <ExternalServicesProvider externalServices={externalServices}>
        {children}
      </ExternalServicesProvider>
    </IntlProvider>
  </EuiProvider>
);

const dimensions: Dimension[] = [{ name: 'foo' }, { name: 'qux' }];
const metricItems: ParsedMetricItem[] = [
  {
    metricName: 'field1',
    dimensionFields: [dimensions[0]],
    indexName: 'metrics-*',
    units: [],
    metricTypes: [],
    fieldTypes: [],
  },
  {
    metricName: 'field2',
    dimensionFields: [dimensions[1]],
    indexName: 'metrics-*',
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
      isTabSelected: true,
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
      flyoutState: undefined,
      onFlyoutStateChange: jest.fn(),
      onFlyoutSelectedTabChange: jest.fn(),
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

  it('renders Discover ErrorCallout when METRICS_INFO fetch fails with a network error', () => {
    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: false,
      error: new Error('Network error'),
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { getByTestId, queryByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: TestWrapper,
    });

    expect(getByTestId('discoverErrorCalloutTitle')).toHaveTextContent(
      'Unable to retrieve search results'
    );
    expect(getByTestId('discoverErrorCalloutMessage')).toHaveTextContent('Network error');
    expect(queryByTestId('toggleActions')).not.toBeInTheDocument();
  });

  it('renders Discover ErrorCallout with embedded ES|QL error message (HTTP 200 + error body)', () => {
    const embeddedError = new EsqlResponseError(
      {
        type: 'illegal_argument_exception',
        reason: 'Unknown column [bad.field]',
      },
      { status: 400 }
    );

    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: false,
      error: embeddedError,
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: TestWrapper,
    });

    expect(getByTestId('discoverErrorCalloutMessage')).toHaveTextContent(
      'illegal_argument_exception: Unknown column [bad.field]'
    );
  });

  it('renders ES|QL reference link when externalServices provides docLinks', () => {
    useFetchMetricsDataMock.mockReturnValue({
      metricItems: [],
      allDimensions: [],
      activeDimensions: [],
      loading: false,
      error: new Error('METRICS_INFO failed'),
    });
    useMetricFieldsFilterMock.mockReturnValue({ filteredMetricItems: [] });

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: ({ children }) => (
        <TestWrapper
          externalServices={
            {
              docLinks: {
                links: { query: { queryESQL: 'https://www.elastic.co/docs/reference/esql' } },
              },
            } as ExternalServices
          }
        >
          {children}
        </TestWrapper>
      ),
    });

    expect(getByTestId('discoverErrorCalloutESQLReferenceButton')).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/reference/esql'
    );
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

    expect(queryByTestId('discoverErrorCalloutTitle')).not.toBeInTheDocument();
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

    expect(queryByTestId('discoverErrorCalloutTitle')).not.toBeInTheDocument();
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
      flyoutState: undefined,
      onFlyoutStateChange: jest.fn(),
      onFlyoutSelectedTabChange: jest.fn(),
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
      flyoutState: undefined,
      onFlyoutStateChange: jest.fn(),
      onFlyoutSelectedTabChange: jest.fn(),
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
        flyoutState: undefined,
        onFlyoutStateChange: jest.fn(),
        onFlyoutSelectedTabChange: jest.fn(),
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
        flyoutState: undefined,
        onFlyoutStateChange: jest.fn(),
        onFlyoutSelectedTabChange: jest.fn(),
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

  describe('onToolbarDimensionsChange', () => {
    it('calls onDimensionsChange and onBreakdownFieldChange when user picks a dimension via the toolbar', () => {
      const onPageChange = jest.fn();
      const onDimensionsChange = jest.fn();
      const onBreakdownFieldChange = jest.fn();

      useMetricsExperienceStateMock.mockReturnValue({
        currentPage: 2,
        selectedDimensions: [],
        onDimensionsChange,
        onPageChange,
        isFullscreen: false,
        searchTerm: '',
        onSearchTermChange: jest.fn(),
        onToggleFullscreen: jest.fn(),
        flyoutState: undefined,
        onFlyoutStateChange: jest.fn(),
        onFlyoutSelectedTabChange: jest.fn(),
        profileId: 'test-profile-id',
      });

      const { getByTestId } = render(
        <MetricsExperienceGrid {...defaultProps} onBreakdownFieldChange={onBreakdownFieldChange} />,
        { wrapper: IntlProvider }
      );

      act(() => {
        getByTestId('metricsExperienceBreakdownSelectorOption-foo').click();
      });

      expect(onDimensionsChange).toHaveBeenCalledWith([dimensions[0]]);
      // Page reset is now owned exclusively by useDiscoverFieldForBreakdown reacting
      // to the breakdownField prop change — not by the toolbar handler directly.
      expect(onPageChange).not.toHaveBeenCalled();
      expect(onBreakdownFieldChange).toHaveBeenCalledWith(dimensions[0].name);
    });
  });
});
