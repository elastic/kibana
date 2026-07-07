/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HistogramPercentile, SimpleAggregation } from '../../../types';
import { SIMPLE_AGGREGATION_OPTIONS, HISTOGRAM_PERCENTILE_OPTIONS } from './constants';

/**
 * Display labels for `SimpleAggregation` values. Spelled out in full (e.g.
 * "Average" rather than "AVG") for readability -- the underlying value
 * remains the short ES|QL function name used to build the aggregation
 * expression.
 */
export const SIMPLE_AGGREGATION_LABELS: Record<SimpleAggregation, string> = {
  avg: i18n.translate('metricsExperience.gridSettingsFlyout.avgOptionLabel', {
    defaultMessage: 'Average',
  }),
  sum: i18n.translate('metricsExperience.gridSettingsFlyout.sumOptionLabel', {
    defaultMessage: 'Sum',
  }),
  min: i18n.translate('metricsExperience.gridSettingsFlyout.minOptionLabel', {
    defaultMessage: 'Minimum',
  }),
  max: i18n.translate('metricsExperience.gridSettingsFlyout.maxOptionLabel', {
    defaultMessage: 'Maximum',
  }),
};

/** Display labels for `HistogramPercentile` values, e.g. "50th percentile". */
export const HISTOGRAM_PERCENTILE_LABELS: Record<HistogramPercentile, string> = {
  p50: i18n.translate('metricsExperience.gridSettingsFlyout.p50OptionLabel', {
    defaultMessage: '50th percentile',
  }),
  p75: i18n.translate('metricsExperience.gridSettingsFlyout.p75OptionLabel', {
    defaultMessage: '75th percentile',
  }),
  p90: i18n.translate('metricsExperience.gridSettingsFlyout.p90OptionLabel', {
    defaultMessage: '90th percentile',
  }),
  p95: i18n.translate('metricsExperience.gridSettingsFlyout.p95OptionLabel', {
    defaultMessage: '95th percentile',
  }),
  p99: i18n.translate('metricsExperience.gridSettingsFlyout.p99OptionLabel', {
    defaultMessage: '99th percentile',
  }),
};

export const buildSimpleAggregationOptions = (
  dataTestSubjPrefix: string
): Array<EuiSuperSelectOption<SimpleAggregation>> =>
  SIMPLE_AGGREGATION_OPTIONS.map((option) => ({
    value: option,
    inputDisplay: SIMPLE_AGGREGATION_LABELS[option],
    dropdownDisplay: SIMPLE_AGGREGATION_LABELS[option],
    'data-test-subj': `${dataTestSubjPrefix}-${option}`,
  }));

export const buildHistogramPercentileOptions = (): Array<
  EuiSuperSelectOption<HistogramPercentile>
> =>
  HISTOGRAM_PERCENTILE_OPTIONS.map((option) => ({
    value: option,
    inputDisplay: HISTOGRAM_PERCENTILE_LABELS[option],
    dropdownDisplay: HISTOGRAM_PERCENTILE_LABELS[option],
    'data-test-subj': `metricsExperienceGridSettingsHistogramOption-${option}`,
  }));

export const COUNTER_OPTIONS = buildSimpleAggregationOptions(
  'metricsExperienceGridSettingsCounterOption'
);

export const GAUGE_OPTIONS = buildSimpleAggregationOptions(
  'metricsExperienceGridSettingsGaugeOption'
);

export const HISTOGRAM_OPTIONS = buildHistogramPercentileOptions();
