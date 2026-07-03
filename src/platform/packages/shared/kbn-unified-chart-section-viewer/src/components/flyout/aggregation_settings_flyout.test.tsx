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
import { AggregationSettingsFlyout } from './aggregation_settings_flyout';
import type { MetricsAggregationSettings } from '../../types';

const defaultSettings: MetricsAggregationSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

describe('AggregationSettingsFlyout', () => {
  it('marks the currently selected option as active in each list', () => {
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('metricsExperienceAggregationSettingsCounterOption-sum')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('metricsExperienceAggregationSettingsGaugeOption-avg')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('metricsExperienceAggregationSettingsHistogramOption-p95')
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onAggregationSettingsChange with the partial update when a counter option is clicked', async () => {
    const onAggregationSettingsChange = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByTestId('metricsExperienceAggregationSettingsCounterOption-max')
    );

    expect(onAggregationSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
  });

  it('calls onAggregationSettingsChange with the partial update when a gauge option is clicked', async () => {
    const onAggregationSettingsChange = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByTestId('metricsExperienceAggregationSettingsGaugeOption-min')
    );

    expect(onAggregationSettingsChange).toHaveBeenCalledWith({ gaugeAggregation: 'min' });
  });

  it('calls onAggregationSettingsChange with the partial update when a histogram percentile is clicked', async () => {
    const onAggregationSettingsChange = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={onAggregationSettingsChange}
        onClose={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByTestId('metricsExperienceAggregationSettingsHistogramOption-p90')
    );

    expect(onAggregationSettingsChange).toHaveBeenCalledWith({ histogramPercentile: 'p90' });
  });

  it('calls onClose when the flyout close button is clicked', async () => {
    const onClose = jest.fn();
    render(
      <AggregationSettingsFlyout
        aggregationSettings={defaultSettings}
        onAggregationSettingsChange={jest.fn()}
        onClose={onClose}
      />
    );

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
