/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useMetricsExperienceState } from '../observability/metrics/context/metrics_experience_state_provider';
import type { FlyoutState } from '../../restorable_state';

vi.mock('../observability/metrics/context/metrics_experience_state_provider', () => {
      const mocked = {
      useMetricsExperienceState: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./tabs', () => {
      const mocked = {
      OverviewTab: vi.fn(() => <div data-test-subj="overviewTab" />),
      EsqlQueryTab: vi.fn(() => <div data-test-subj="esqlQueryTab" />),
    };
      return { ...mocked, default: mocked };
    });

const useMetricsExperienceStateMock = useMetricsExperienceState as Mock;

const buildContext = (overrides: {
  flyoutState?: FlyoutState;
  onFlyoutSelectedTabChange?: Mock;
}) => ({
  profileId: 'test-profile',
  currentPage: 0,
  searchTerm: '',
  isFullscreen: false,
  selectedDimensions: [],
  flyoutState: overrides.flyoutState,
  onPageChange: vi.fn(),
  onDimensionsChange: vi.fn(),
  onSearchTermChange: vi.fn(),
  onToggleFullscreen: vi.fn(),
  onFlyoutStateChange: vi.fn(),
  onFlyoutSelectedTabChange: overrides.onFlyoutSelectedTabChange ?? vi.fn(),
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
    vi.clearAllMocks();
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
    const onFlyoutSelectedTabChange = vi.fn();
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
