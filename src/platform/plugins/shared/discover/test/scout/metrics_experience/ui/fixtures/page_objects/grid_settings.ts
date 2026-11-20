/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export type SimpleAggregationOption = 'avg' | 'sum' | 'min' | 'max';
export type HistogramPercentileOption = 'p50' | 'p75' | 'p90' | 'p95' | 'p99';
export type HistogramDisplayOption = 'distribution' | 'percentile';

export interface GridSettings {
  readonly editButton: Locator;
  readonly flyout: Locator;
  readonly counterSelect: Locator;
  readonly gaugeSelect: Locator;
  readonly histogramSelect: Locator;
  readonly distributionChoice: Locator;
  readonly percentileChoice: Locator;
  readonly applyButton: Locator;
  readonly cancelButton: Locator;
  readonly open: () => Promise<void>;
  /** Opens the counter dropdown and clicks the given option; does not apply it. */
  readonly selectCounterAggregation: (option: SimpleAggregationOption) => Promise<void>;
  /** Opens the gauge dropdown and clicks the given option; does not apply it. */
  readonly selectGaugeAggregation: (option: SimpleAggregationOption) => Promise<void>;
  /** Opens the histogram percentile dropdown and clicks the given option; does not apply it. */
  readonly selectHistogramPercentile: (option: HistogramPercentileOption) => Promise<void>;
  /** Selects how histogram metrics are drawn; does not apply it. */
  readonly selectHistogramDisplay: (option: HistogramDisplayOption) => Promise<void>;
  /** Clicks "Apply and close": commits the staged selections and closes the flyout. */
  readonly apply: () => Promise<void>;
  /** Clicks "Cancel": discards the staged selections and closes the flyout. */
  readonly cancel: () => Promise<void>;
}

export function createGridSettings(page: ScoutPage): GridSettings {
  const editButton = page.testSubj.locator('metricsExperienceEditGridButton');
  const flyout = page.testSubj.locator('metricsExperienceGridSettingsFlyout');
  const counterSelect = page.testSubj.locator('metricsExperienceGridSettingsCounterSelect');
  const gaugeSelect = page.testSubj.locator('metricsExperienceGridSettingsGaugeSelect');
  const histogramSelect = page.testSubj.locator('metricsExperienceGridSettingsHistogramSelect');
  const distributionChoice = page.testSubj.locator(
    'metricsExperienceGridSettingsDistributionChoice'
  );
  const percentileChoice = page.testSubj.locator('metricsExperienceGridSettingsPercentileChoice');
  const histogramDisplayChoices = {
    distribution: distributionChoice,
    percentile: percentileChoice,
  } as const;
  const applyButton = page.testSubj.locator('metricsExperienceGridSettingsApplyButton');
  const cancelButton = page.testSubj.locator('metricsExperienceGridSettingsCancelButton');

  const open = async () => {
    if (!(await flyout.isVisible())) {
      await editButton.click();
      await flyout.waitFor({ state: 'visible' });
    }
  };

  const selectFromDropdown = async (trigger: Locator, optionTestSubj: string) => {
    await open();
    await trigger.click();
    const option = page.testSubj.locator(optionTestSubj);
    await option.waitFor({ state: 'visible' });
    await option.click();
  };

  return {
    editButton,
    flyout,
    counterSelect,
    gaugeSelect,
    histogramSelect,
    distributionChoice,
    percentileChoice,
    applyButton,
    cancelButton,
    open,
    selectCounterAggregation: (option) =>
      selectFromDropdown(counterSelect, `metricsExperienceGridSettingsCounterOption-${option}`),
    selectGaugeAggregation: (option) =>
      selectFromDropdown(gaugeSelect, `metricsExperienceGridSettingsGaugeOption-${option}`),
    selectHistogramPercentile: (option) =>
      selectFromDropdown(histogramSelect, `metricsExperienceGridSettingsHistogramOption-${option}`),
    selectHistogramDisplay: async (option) => {
      await open();
      await histogramDisplayChoices[option].click();
    },
    apply: async () => {
      await applyButton.click();
      await flyout.waitFor({ state: 'hidden' });
    },
    cancel: async () => {
      await cancelButton.click();
      await flyout.waitFor({ state: 'hidden' });
    },
  };
}
