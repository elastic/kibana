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
import { MetricsExperienceGrid } from './metrics_experience_grid';
import * as hooks from '../store/hooks';
import * as metricHooks from '../hooks';
import { FIELD_VALUE_SEPARATOR } from '../common/utils';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MetricsGridState } from '../store/slices';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../store/hooks');
jest.mock('../hooks');
jest.mock('./metric_chart', () => ({
  MetricChart: jest.fn(() => <div data-test-subj="metric-chart" />),
}));

const useAppDispatchMock = hooks.useAppDispatch as jest.Mock<typeof hooks.useAppDispatch>;
const useAppSelectorMock = hooks.useAppSelector as jest.Mock<typeof hooks.useAppSelector>;
const useMetricFieldsQueryMock = metricHooks.useMetricFieldsQuery as jest.MockedFunction<
  typeof metricHooks.useMetricFieldsQuery
>;
const useMetricMetricDataQueryMock = metricHooks.useMetricDataQuery as jest.MockedFunction<
  typeof metricHooks.useMetricDataQuery
>;
const useDimensionsQueryMock = metricHooks.useDimensionsQuery as jest.MockedFunction<
  typeof metricHooks.useDimensionsQuery
>;

describe('MetricsExperienceGrid', () => {
  const defaultProps: ChartSectionProps = {
    dataView: { getIndexPattern: () => 'metrics-*' } as ChartSectionProps['dataView'],
    renderToggleActions: () => <div data-test-subj="toggleActions" />,
    chartToolbarCss: { name: '', styles: '' },
    histogramCss: { name: '', styles: '' },
    getTimeRange: () => ({ from: 'now-15m', to: 'now' }),
  };

  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useAppDispatchMock.mockReturnValue(mockDispatch);
    useAppSelectorMock.mockImplementation(
      (selectorFn: (state: { metricsGrid: MetricsGridState }) => <TSelected>() => TSelected) =>
        selectorFn({
          metricsGrid: {
            currentPage: 0,
            dimensions: [],
            valueFilters: [],
            isFullscreen: false,
          },
        })
    );

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
    } as unknown as ReturnType<typeof metricHooks.useDimensionsQuery>);

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

    useMetricMetricDataQueryMock.mockReturnValue({
      data: {
        data: [],
        esqlQuery: 'FROM metrics-*',
        hasDimensions: true,
      },
    } as unknown as ReturnType<typeof metricHooks.useMetricDataQuery>);
  });

  it('renders the <MetricsGrid />', () => {
    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });
    expect(getByTestId('unifiedMetricsExperienceGrid')).toBeInTheDocument();
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
    useAppSelectorMock.mockImplementation(
      (selectorFn: (state: { metricsGrid: MetricsGridState }) => <TSelected>() => TSelected) =>
        selectorFn({
          metricsGrid: {
            currentPage: 0,
            dimensions: ['foo'],
            valueFilters: [`foo${FIELD_VALUE_SEPARATOR}bar`],
            isFullscreen: false,
          },
        })
    );

    const { getByTestId } = render(<MetricsExperienceGrid {...defaultProps} />, {
      wrapper: IntlProvider,
    });

    expect(getByTestId('metricsExperienceValuesSelectorButton')).toBeInTheDocument();
  });
});
