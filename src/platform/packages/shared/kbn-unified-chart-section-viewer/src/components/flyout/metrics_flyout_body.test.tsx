/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useMetricsExperienceState } from '../observability/metrics/context/metrics_experience_state_provider';
import type { FlyoutState } from '../../restorable_state';

jest.mock('../observability/metrics/context/metrics_experience_state_provider', () => ({
  useMetricsExperienceState: jest.fn(),
}));

jest.mock('./tabs', () => ({
  OverviewTab: jest.fn(() => <div data-test-subj="overviewTab" />),
  EsqlQueryTab: jest.fn(() => <div data-test-subj="esqlQueryTab" />),
}));

const useMetricsExperienceStateMock = useMetricsExperienceState as jest.Mock;

const buildContext = (overrides: {
  flyoutState?: FlyoutState;
  onFlyoutSelectedTabChange?: jest.Mock;
}) => ({
  profileId: 'test-profile',
  currentPage: 0,
  searchTerm: '',
  isFullscreen: false,
  selectedDimensions: [],
  flyoutState: overrides.flyoutState,
  onPageChange: jest.fn(),
  onDimensionsChange: jest.fn(),
  onSearchTermChange: jest.fn(),
  onToggleFullscreen: jest.fn(),
  onFlyoutStateChange: jest.fn(),
  onFlyoutSelectedTabChange: overrides.onFlyoutSelectedTabChange ?? jest.fn(),
});

const metricItem: ParsedMetricItem = {
  metricName: 'test.metric',
  indexName: 'test-data-stream',
  units: ['ms'],
  metricTypes: ['counter'],
  fieldTypes: [ES_FIELD_TYPES.LONG],
  dimensionFields: [{ name: 'host.name' }],
};

describe('MetricFlyoutBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to the Overview tab when flyoutState has no selectedTabId', () => {
    useMetricsExperienceStateMock.mockReturnValue(buildContext({ flyoutState: undefined }));

    const { getByTestId, queryByTestId } = render(<MetricFlyoutBody metricItem={metricItem} />);

    expect(getByTestId('overviewTab')).toBeInTheDocument();
    expect(queryByTestId('esqlQueryTab')).not.toBeInTheDocument();
  });

  it('renders the ES|QL Query tab when flyoutState selectedTabId is "esql-query"', () => {
    useMetricsExperienceStateMock.mockReturnValue(
      buildContext({
        flyoutState: {
          gridPosition: 0,
          metricUniqueKey: 'test-data-stream::test.metric',
          esqlQuery: 'FROM test',
          selectedTabId: 'esql-query',
        },
      })
    );

    const { getByTestId, queryByTestId } = render(
      <MetricFlyoutBody metricItem={metricItem} esqlQuery="FROM test" />
    );

    expect(getByTestId('esqlQueryTab')).toBeInTheDocument();
    expect(queryByTestId('overviewTab')).not.toBeInTheDocument();
  });

  it('calls onFlyoutSelectedTabChange with the clicked tab id', () => {
    const onFlyoutSelectedTabChange = jest.fn();
    useMetricsExperienceStateMock.mockReturnValue(
      buildContext({
        flyoutState: {
          gridPosition: 0,
          metricUniqueKey: 'test-data-stream::test.metric',
          esqlQuery: 'FROM test',
          selectedTabId: 'overview',
        },
        onFlyoutSelectedTabChange,
      })
    );

    const { getByTestId } = render(<MetricFlyoutBody metricItem={metricItem} />);

    fireEvent.click(getByTestId('metricsExperienceFlyoutEsqlQueryTab'));
    expect(onFlyoutSelectedTabChange).toHaveBeenCalledWith('esql-query');

    fireEvent.click(getByTestId('metricsExperienceFlyoutOverviewTab'));
    expect(onFlyoutSelectedTabChange).toHaveBeenCalledWith('overview');
  });
});
