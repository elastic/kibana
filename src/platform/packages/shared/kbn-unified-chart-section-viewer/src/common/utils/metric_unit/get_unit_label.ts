/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { MetricUnit } from '../../../types';

const unitToLabel: Record<MetricUnit, string> = {
  ns: i18n.translate('metricsExperience.metricUnit.label.nanoseconds', {
    defaultMessage: 'nanoseconds',
  }),
  us: i18n.translate('metricsExperience.metricUnit.label.microseconds', {
    defaultMessage: 'microseconds',
  }),
  ms: i18n.translate('metricsExperience.metricUnit.label.milliseconds', {
    defaultMessage: 'milliseconds',
  }),
  s: i18n.translate('metricsExperience.metricUnit.label.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('metricsExperience.metricUnit.label.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('metricsExperience.metricUnit.label.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('metricsExperience.metricUnit.label.days', {
    defaultMessage: 'days',
  }),
  percent: i18n.translate('metricsExperience.metricUnit.label.percent', {
    defaultMessage: 'percent',
  }),
  bytes: i18n.translate('metricsExperience.metricUnit.label.bytes', {
    defaultMessage: 'bytes',
  }),
  count: i18n.translate('metricsExperience.metricUnit.label.count', {
    defaultMessage: 'count',
  }),
};

export function getUnitLabel({ unit }: { unit: MetricUnit | undefined }) {
  if (!unit) {
    return unitToLabel.count;
  }

  return unitToLabel[unit] ?? unit;
}
