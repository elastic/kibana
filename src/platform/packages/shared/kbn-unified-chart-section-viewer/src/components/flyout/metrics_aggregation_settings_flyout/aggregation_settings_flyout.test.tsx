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
import { AggregationSettingsFlyout } from './aggregation_settings_flyout';
import type { MetricsAggregationSettings } from '../../../types';

const defaultSettings: MetricsAggregationSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

const counterSelect = new EuiSuperSelectTestHarness(
  'metricsExperienceAggregationSettingsCounterSelect'
);
const gaugeSelect = new EuiSuperSelectTestHarness(
  'metricsExperienceAggregationSettingsGaugeSelect'
);
const histogramSelect = new EuiSuperSelectTestHarness(
  'metricsExperienceAggregationSettingsHistogramSelect'
);

describe('AggregationSettingsFlyout', () => {
  it('shows the currently applied option as the selected value in each dropdown', () => {
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(counterSelect.getSelected()).toContain('Sum');
    expect(gaugeSelect.getSelected()).toContain('Average');
    expect(histogramSelect.getSelected()).toContain('95th percentile');
  });

  it('disables "Apply and close" until a selection actually changes', async () => {
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('metricsExperienceAggregationSettingsApplyButton')).toBeDisabled();

    await counterSelect.select('metricsExperienceAggregationSettingsCounterOption-max');

    expect(screen.getByTestId('metricsExperienceAggregationSettingsApplyButton')).toBeEnabled();
  });

  it('does not call onAggregationSettingsChange until "Apply and close" is clicked, then closes', async () => {
    const onAggregationSettingsChange = jest.fn();
    const onClose = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceAggregationSettingsCounterOption-max');

    expect(onAggregationSettingsChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('metricsExperienceAggregationSettingsApplyButton'));

    expect(onAggregationSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
    expect(onClose).toHaveBeenCalled();
  });

  it('applies only the fields that changed across all three dropdowns', async () => {
    const onAggregationSettingsChange = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={jest.fn()}
      />
    );

    await gaugeSelect.select('metricsExperienceAggregationSettingsGaugeOption-min');
    await histogramSelect.select('metricsExperienceAggregationSettingsHistogramOption-p90');

    await userEvent.click(screen.getByTestId('metricsExperienceAggregationSettingsApplyButton'));

    expect(onAggregationSettingsChange).toHaveBeenCalledWith({
      gaugeAggregation: 'min',
      histogramPercentile: 'p90',
    });
  });

  it('discards the draft and does not call onAggregationSettingsChange when Cancel is clicked', async () => {
    const onAggregationSettingsChange = jest.fn();
    const onClose = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceAggregationSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('metricsExperienceAggregationSettingsCancelButton'));

    expect(onAggregationSettingsChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('discards the draft and does not call onAggregationSettingsChange when the flyout close button is clicked', async () => {
    const onAggregationSettingsChange = jest.fn();
    const onClose = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceAggregationSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onAggregationSettingsChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
