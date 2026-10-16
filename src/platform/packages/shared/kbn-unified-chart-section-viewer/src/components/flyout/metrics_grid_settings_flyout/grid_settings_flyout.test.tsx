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

jest.mock('@kbn/discover-utils', () => {
  const { METRICS_GRID_HISTOGRAM_PERCENTILES, METRICS_GRID_SIMPLE_AGGREGATIONS } =
    jest.requireActual('@kbn/discover-utils/src/data_types/metrics');

  return {
    METRICS_GRID_HISTOGRAM_PERCENTILES,
    METRICS_GRID_SIMPLE_AGGREGATIONS,
  };
});

const mockTrackAggregationConfigChanged = jest.fn();

jest.mock('../../../context/ebt_telemetry_context', () => ({
  useTelemetry: () => ({
    trackAggregationConfigChanged: mockTrackAggregationConfigChanged,
  }),
}));

const defaultSettings: MetricsGridSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'distribution',
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
    jest.clearAllMocks();
  });

  it('renders the aggregation settings inside an accordion that is open by default', () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('metricsExperienceGridSettingsAggregationAccordion')
    ).toBeInTheDocument();
    expect(counterSelect.getSelected()).toContain('Sum');
    expect(gaugeSelect.getSelected()).toContain('Average');
    expect(histogramSelect.getSelected()).toContain('Distribution');
  });

  it('disables "Apply and close" until a selection actually changes', async () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeDisabled();

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeEnabled();
  });

  it('does not call onGridSettingsChange until "Apply and close" is clicked, then closes', async () => {
    const onGridSettingsChange = jest.fn();
    const onClose = jest.fn();
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
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    await gaugeSelect.select('metricsExperienceGridSettingsGaugeOption-min');
    await histogramSelect.select('metricsExperienceGridSettingsHistogramOption-p99');
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(mockTrackAggregationConfigChanged).toHaveBeenCalledTimes(2);
    expect(mockTrackAggregationConfigChanged).toHaveBeenNthCalledWith(1, {
      metric_type: 'gauge',
      previous_aggregation: 'avg',
      new_aggregation: 'min',
    });
    expect(mockTrackAggregationConfigChanged).toHaveBeenNthCalledWith(2, {
      metric_type: 'histogram',
      previous_aggregation: 'distribution',
      new_aggregation: 'p99',
    });
  });

  it('discards the draft and does not call onGridSettingsChange when Cancel is clicked', async () => {
    const onGridSettingsChange = jest.fn();
    const onClose = jest.fn();
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

  it('shows the 95th percentile and disables Distribution when heatmaps are disabled', async () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />,
      { isHeatmapsEnabled: false }
    );

    expect(histogramSelect.getSelected()).toContain('95th percentile');
    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeDisabled();

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsHistogramSelect'));
    const distributionOption = await screen.findByTestId(
      'metricsExperienceGridSettingsHistogramOption-distribution'
    );
    expect(distributionOption).toHaveAttribute('aria-disabled', 'true');
    expect(distributionOption).toHaveTextContent('Distribution');

    const tooltipAnchor = distributionOption.parentElement;
    if (!tooltipAnchor) {
      throw new Error('Expected the distribution option to be wrapped for its tooltip');
    }
    await userEvent.hover(tooltipAnchor);
    expect(
      await screen.findByText(
        'Distribution is unavailable while heatmaps are disabled. Histograms use the 95th percentile instead.'
      )
    ).toBeInTheDocument();
  });

  it('keeps a selected percentile when heatmaps disable Distribution', async () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{ ...defaultSettings, histogramPercentile: 'p90' }}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />,
      { isHeatmapsEnabled: false }
    );

    expect(histogramSelect.getSelected()).toContain('90th percentile');

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsHistogramSelect'));
    expect(
      await screen.findByTestId('metricsExperienceGridSettingsHistogramOption-distribution')
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the 95th percentile and disables Distribution when dimensions are selected', async () => {
    const onGridSettingsChange = jest.fn();
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{ ...defaultSettings, dimensions: ['host.name'] }}
        onGridSettingsChange={onGridSettingsChange}
        onClose={jest.fn()}
      />
    );

    expect(histogramSelect.getSelected()).toContain('95th percentile');
    expect(screen.getByTestId('metricsExperienceGridSettingsApplyButton')).toBeDisabled();

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsHistogramSelect'));
    const distributionOption = await screen.findByTestId(
      'metricsExperienceGridSettingsHistogramOption-distribution'
    );
    expect(distributionOption).toHaveAttribute('aria-disabled', 'true');
    expect(distributionOption).toHaveTextContent('Distribution');

    const tooltipAnchor = distributionOption.parentElement;
    if (!tooltipAnchor) {
      throw new Error('Expected the distribution option to be wrapped for its tooltip');
    }
    await userEvent.hover(tooltipAnchor);
    expect(
      await screen.findByText(
        'Distribution is unavailable while dimensions are selected. Histograms use the 95th percentile instead.'
      )
    ).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');
    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsApplyButton'));

    expect(onGridSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
  });

  it('keeps a selected percentile when dimensions disable Distribution', async () => {
    renderFlyout(
      <GridSettingsFlyout
        gridSettings={{
          ...defaultSettings,
          histogramPercentile: 'p90',
          dimensions: ['host.name'],
        }}
        onGridSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(histogramSelect.getSelected()).toContain('90th percentile');

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsHistogramSelect'));
    expect(
      await screen.findByTestId('metricsExperienceGridSettingsHistogramOption-distribution')
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('discards the draft and does not call onGridSettingsChange when the flyout close button is clicked', async () => {
    const onGridSettingsChange = jest.fn();
    const onClose = jest.fn();
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
