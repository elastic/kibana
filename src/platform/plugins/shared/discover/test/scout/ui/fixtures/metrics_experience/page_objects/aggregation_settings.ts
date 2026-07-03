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

export interface AggregationSettings {
  readonly editButton: Locator;
  readonly flyout: Locator;
  readonly open: () => Promise<void>;
  readonly selectCounterAggregation: (option: SimpleAggregationOption) => Promise<void>;
  readonly selectGaugeAggregation: (option: SimpleAggregationOption) => Promise<void>;
  readonly selectHistogramPercentile: (option: HistogramPercentileOption) => Promise<void>;
  readonly close: () => Promise<void>;
  readonly getCounterOption: (option: SimpleAggregationOption) => Locator;
  readonly getGaugeOption: (option: SimpleAggregationOption) => Locator;
  readonly getHistogramOption: (option: HistogramPercentileOption) => Locator;
}

export function createAggregationSettings(page: ScoutPage): AggregationSettings {
  const editButton = page.testSubj.locator('metricsExperienceEditAggregationsButton');
  const flyout = page.testSubj.locator('metricsExperienceAggregationSettingsFlyout');

  const open = async () => {
    if (!(await flyout.isVisible())) {
      await editButton.click();
      await flyout.waitFor({ state: 'visible' });
    }
  };

  const selectOption = async (testSubj: string) => {
    await open();
    await page.testSubj.click(testSubj);
  };

  return {
    editButton,
    flyout,
    open,
    selectCounterAggregation: (option) =>
      selectOption(`metricsExperienceAggregationSettingsCounterOption-${option}`),
    selectGaugeAggregation: (option) =>
      selectOption(`metricsExperienceAggregationSettingsGaugeOption-${option}`),
    selectHistogramPercentile: (option) =>
      selectOption(`metricsExperienceAggregationSettingsHistogramOption-${option}`),
    close: async () => {
      await page.testSubj.click('euiFlyoutCloseButton');
      await flyout.waitFor({ state: 'hidden' });
    },
    getCounterOption: (option) =>
      page.testSubj.locator(`metricsExperienceAggregationSettingsCounterOption-${option}`),
    getGaugeOption: (option) =>
      page.testSubj.locator(`metricsExperienceAggregationSettingsGaugeOption-${option}`),
    getHistogramOption: (option) =>
      page.testSubj.locator(`metricsExperienceAggregationSettingsHistogramOption-${option}`),
  };
}
