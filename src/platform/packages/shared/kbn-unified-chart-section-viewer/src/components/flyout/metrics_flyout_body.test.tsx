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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MetricField } from '../../types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useMetricsExperienceState } from '../observability/metrics/context/metrics_experience_state_provider';

jest.mock('../observability/metrics/context/metrics_experience_state_provider', () => ({
  useMetricsExperienceState: jest.fn(),
}));

const mockUseMetricsExperienceState = useMetricsExperienceState as jest.Mock;

describe('MetricFlyoutBody', () => {
  const createMockMetric = (overrides: Partial<MetricField> = {}): MetricField => ({
    name: 'system.cpu.user.pct',
    index: 'metrics-*',
    type: ES_FIELD_TYPES.FLOAT,
    uniqueKey: 'metrics-*::system.cpu.user.pct',
    dimensions: [],
    ...overrides,
  });

  const mockOnFlyoutTabChange = jest.fn();

  const createDefaultFlyoutState = (overrides = {}) => ({
    gridPosition: 0,
    metricUniqueKey: 'metrics-*::system.cpu.user.pct',
    esqlQuery: 'FROM metrics-*',
    selectedTabId: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetricsExperienceState.mockReturnValue({
      flyoutState: createDefaultFlyoutState(),
      onFlyoutTabChange: mockOnFlyoutTabChange,
    });
  });

  it('renders both tabs', () => {
    const metric = createMockMetric();
    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ES|QL Query' })).toBeInTheDocument();
  });

  it('defaults to Overview tab when selectedTabId is undefined', () => {
    const metric = createMockMetric();
    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const esqlTab = screen.getByRole('tab', { name: 'ES|QL Query' });

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(esqlTab).toHaveAttribute('aria-selected', 'false');
  });

  it('selects the tab from flyoutState.selectedTabId', () => {
    mockUseMetricsExperienceState.mockReturnValue({
      flyoutState: createDefaultFlyoutState({ selectedTabId: 'esql-query' }),
      onFlyoutTabChange: mockOnFlyoutTabChange,
    });

    const metric = createMockMetric();
    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const esqlTab = screen.getByRole('tab', { name: 'ES|QL Query' });

    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
    expect(esqlTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onFlyoutTabChange when clicking a tab', async () => {
    const user = userEvent.setup();
    const metric = createMockMetric();

    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    const esqlTab = screen.getByRole('tab', { name: 'ES|QL Query' });
    await user.click(esqlTab);

    expect(mockOnFlyoutTabChange).toHaveBeenCalledWith('esql-query');
  });

  it('calls onFlyoutTabChange with overview when clicking Overview tab', async () => {
    const user = userEvent.setup();

    mockUseMetricsExperienceState.mockReturnValue({
      flyoutState: createDefaultFlyoutState({ selectedTabId: 'esql-query' }),
      onFlyoutTabChange: mockOnFlyoutTabChange,
    });

    const metric = createMockMetric();
    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    await user.click(overviewTab);

    expect(mockOnFlyoutTabChange).toHaveBeenCalledWith('overview');
  });

  it('handles undefined flyoutState gracefully', () => {
    mockUseMetricsExperienceState.mockReturnValue({
      flyoutState: undefined,
      onFlyoutTabChange: mockOnFlyoutTabChange,
    });

    const metric = createMockMetric();
    render(<MetricFlyoutBody metric={metric} esqlQuery="FROM metrics-*" />);

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });
});
