/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiSuperSelectTestHarness } from '@kbn/test-eui-helpers';
import { type MetricsGridSettings } from '@kbn/discover-utils';
import { FEATURE_FLAGS } from '../../../common/constants';
import { ExternalServicesProvider } from '../../../context/external_services';
import { createFeatureFlagsMock } from '../../../test_utils/create_feature_flags_mock';
import { GridSettingsFlyout } from './grid_settings_flyout';

vi.mock('@kbn/discover-utils', async () => {
  const metrics = await vi.importActual('@kbn/discover-utils/src/data_types/metrics');

  const mockedModule = {
    METRICS_GRID_HISTOGRAM_PERCENTILES: metrics.METRICS_GRID_HISTOGRAM_PERCENTILES,
    METRICS_GRID_SIMPLE_AGGREGATIONS: metrics.METRICS_GRID_SIMPLE_AGGREGATIONS,
    isHistogramVisualization: metrics.isHistogramVisualization,
  };
  return { ...mockedModule, default: mockedModule };
});

const mockTrackAggregationConfigChanged = vi.fn();

vi.mock('../../../context/ebt_telemetry_context', () => {
  const mockedModule = {
    useTelemetry: () => ({
      trackAggregationConfigChanged: mockTrackAggregationConfigChanged,
    }),
  };
  return { ...mockedModule, default: mockedModule };
});

const defaultSettings: MetricsGridSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
  histogramVisualization: 'lnsHeatmap',
  dimensions: [],
  searchTerm: '',
};

const counterSelect = new EuiSuperSelectTestHarness('metricsExperienceGridSettingsCounterSelect');
const gaugeSelect = new EuiSuperSelectTestHarness('metricsExperienceGridSettingsGaugeSelect');
const histogramSelect = new EuiSuperSelectTestHarness(
  'metricsExperienceGridSettingsHistogramSelect'
);

const renderFlyout = (
  ui: React.ReactElement,
  { isHeatmapsEnabled = true }: { isHeatmapsEnabled?: boolean } = {}
) =>
  render(
    <ExternalServicesProvider
      externalServices={{
        featureFlags: createFeatureFlagsMock({
          [FEATURE_FLAGS.IS_HEATMAPS_ENABLED]: isHeatmapsEnabled,
        }),
      }}
    >
      {ui}
    </ExternalServicesProvider>
  );

describe('GridSettingsFlyout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders counters and histograms in accordions that are open by default', () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.queryByTestId('metricsExperienceGridSettingsAggregationAccordion')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('metricsExperienceGridSettingsMetricsAccordion')).toBeInTheDocument();
    expect(
      screen.getByTestId('metricsExperienceGridSettingsHistogramsAccordion')
    ).toBeInTheDocument();
    expect(counterSelect.getSelected()).toContain('Sum');
    expect(gaugeSelect.getSelected()).toContain('Average');
    expect(histogramSelect.getSelected()).toContain('95th percentile');
    expect(screen.getByTestId('metricsExperienceGridSettingsDistributionChoice')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('disables "Apply and close" until a selection actually changes', async () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeDisabled();

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeEnabled();
  });

  it('does not call onGridSettingsChange until "Apply and close" is clicked, then closes', async () => {
    const onGridSettingsChange = vi.fn();
    const onClose = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    expect(onGridSettingsChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(mockTrackAggregationConfigChanged).toHaveBeenCalledWith({
      metric_type: 'counter',
      previous_aggregation: 'sum',
      new_aggregation: 'max',
    });
    expect(onGridSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
    expect(onClose).toHaveBeenCalled();
  });

  it('reports each changed metric type when multiple settings are applied', async () => {
    const onGridSettingsChange = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={vi.fn()}
      />
    );

    await gaugeSelect.select('metricsExperienceGridSettingsGaugeOption-min');
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsPercentileChoice'));
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(mockTrackAggregationConfigChanged).toHaveBeenCalledTimes(2);
    expect(mockTrackAggregationConfigChanged).toHaveBeenNthCalledWith(1, {
      metric_type: 'gauge',
      previous_aggregation: 'avg',
      new_aggregation: 'min',
    });
    expect(mockTrackAggregationConfigChanged).toHaveBeenNthCalledWith(2, {
      metric_type: 'histogram',
      previous_aggregation: 'p95',
      new_aggregation: 'p95',
      previous_visualization: 'lnsHeatmap',
      new_visualization: 'lnsXY',
    });
    expect(onGridSettingsChange).toHaveBeenCalledWith({
      gaugeAggregation: 'min',
      histogramVisualization: 'lnsXY',
    });
  });

  it('stores Distribution on its own choice and keeps the percentile', async () => {
    const onGridSettingsChange = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{ ...defaultSettings, histogramVisualization: 'lnsXY' }}
        onGridSettingsChange={onGridSettingsChange}
        onClose={vi.fn()}
      />
    );

    expect(histogramSelect.getSelected()).toContain('95th percentile');
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsDistributionChoice'));
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(onGridSettingsChange).toHaveBeenCalledWith({ histogramVisualization: 'lnsHeatmap' });
    expect(mockTrackAggregationConfigChanged).toHaveBeenCalledWith({
      metric_type: 'histogram',
      previous_aggregation: 'p95',
      new_aggregation: 'p95',
      previous_visualization: 'lnsXY',
      new_visualization: 'lnsHeatmap',
    });
  });

  it('changes the percentile fallback without turning Distribution off', async () => {
    const onGridSettingsChange = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={vi.fn()}
      />
    );

    await histogramSelect.select('metricsExperienceGridSettingsHistogramOption-p99');
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(onGridSettingsChange).toHaveBeenCalledWith({ histogramPercentile: 'p99' });
    expect(mockTrackAggregationConfigChanged).toHaveBeenCalledWith({
      metric_type: 'histogram',
      previous_aggregation: 'p95',
      new_aggregation: 'p99',
      previous_visualization: 'lnsHeatmap',
      new_visualization: 'lnsHeatmap',
    });
  });

  it('discards the draft and does not call onGridSettingsChange when Cancel is clicked', async () => {
    const onGridSettingsChange = vi.fn();
    const onClose = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsCancelButton'));

    expect(onGridSettingsChange).not.toHaveBeenCalled();
    expect(mockTrackAggregationConfigChanged).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the Distribution choice and shows p95 when heatmaps are disabled', () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={vi.fn()}
        onClose={vi.fn()}
      />,
      { isHeatmapsEnabled: false }
    );

    expect(histogramSelect.getSelected()).toContain('95th percentile');
    expect(screen.getByText('Histogram')).toBeInTheDocument();
    expect(
      screen.getByTestId('metricsExperienceGridSettingsAggregationAccordion')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('metricsExperienceGridSettingsHistogramsAccordion')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('metricsExperienceGridSettingsMetricsAccordion')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('metricsExperienceGridSettingsDistributionChoice')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeDisabled();
  });

  it('keeps a selected percentile when heatmaps hide Distribution', () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{ ...defaultSettings, histogramPercentile: 'p90' }}
        onGridSettingsChange={vi.fn()}
        onClose={vi.fn()}
      />,
      { isHeatmapsEnabled: false }
    );

    expect(histogramSelect.getSelected()).toContain('90th percentile');
    expect(
      screen.queryByTestId('metricsExperienceGridSettingsDistributionChoice')
    ).not.toBeInTheDocument();
  });

  it('keeps Distribution selectable when dimensions are selected', () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{
          ...defaultSettings,
          histogramVisualization: 'lnsXY',
          dimensions: ['host.name'],
        }}
        onGridSettingsChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('metricsExperienceGridSettingsDistributionChoice')).toBeEnabled();
  });

  it('discards the draft and does not call onGridSettingsChange when the flyout close button is clicked', async () => {
    const onGridSettingsChange = vi.fn();
    const onClose = vi.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onGridSettingsChange).not.toHaveBeenCalled();
    expect(mockTrackAggregationConfigChanged).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
