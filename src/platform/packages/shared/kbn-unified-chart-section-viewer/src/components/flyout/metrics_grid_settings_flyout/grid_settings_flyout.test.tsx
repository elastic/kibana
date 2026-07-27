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
import { GridSettingsFlyout } from './grid_settings_flyout';
import type { MetricsGridSettings } from '../../../types';

const defaultSettings: MetricsGridSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

const counterSelect = new EuiSuperSelectTestHarness('metricsExperienceGridSettingsCounterSelect');
const gaugeSelect = new EuiSuperSelectTestHarness('metricsExperienceGridSettingsGaugeSelect');
const histogramSelect = new EuiSuperSelectTestHarness(
  'metricsExperienceGridSettingsHistogramSelect'
);

describe('GridSettingsFlyout', () => {
  it('renders the aggregation settings inside an accordion that is open by default', () => {
    render(
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
    expect(histogramSelect.getSelected()).toContain('95th percentile');
  });

  it('disables "Apply and close" until a selection actually changes', async () => {
    render(
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
    render(
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

    expect(onGridSettingsChange).toHaveBeenCalledWith({ counterAggregation: 'max' });
    expect(onClose).toHaveBeenCalled();
  });

  it('discards the draft and does not call onGridSettingsChange when Cancel is clicked', async () => {
    const onGridSettingsChange = jest.fn();
    const onClose = jest.fn();
    render(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('metricsExperienceGridSettingsCancelButton'));

    expect(onGridSettingsChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('discards the draft and does not call onGridSettingsChange when the flyout close button is clicked', async () => {
    const onGridSettingsChange = jest.fn();
    const onClose = jest.fn();
    render(
      <GridSettingsFlyout
        gridSettings={defaultSettings}
        onGridSettingsChange={onGridSettingsChange}
        onClose={onClose}
      />
    );

    await counterSelect.select('metricsExperienceGridSettingsCounterOption-max');

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onGridSettingsChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
