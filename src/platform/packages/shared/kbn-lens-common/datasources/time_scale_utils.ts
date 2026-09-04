/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { TimeScaleUnit } from '../types';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

export const unitSuffixes: Record<TimeScaleUnit, string> = {
  s: i18n.translate('xpack.lens.fieldFormats.suffix.s', { defaultMessage: '/s' }),
  m: i18n.translate('xpack.lens.fieldFormats.suffix.m', { defaultMessage: '/m' }),
  h: i18n.translate('xpack.lens.fieldFormats.suffix.h', { defaultMessage: '/h' }),
  d: i18n.translate('xpack.lens.fieldFormats.suffix.d', { defaultMessage: '/d' }),
};

export const unitSuffixesLong: Record<TimeScaleUnit, string> = {
  s: i18n.translate('xpack.lens.fieldFormats.longSuffix.s', { defaultMessage: 'per second' }),
  m: i18n.translate('xpack.lens.fieldFormats.longSuffix.m', { defaultMessage: 'per minute' }),
  h: i18n.translate('xpack.lens.fieldFormats.longSuffix.h', { defaultMessage: 'per hour' }),
  d: i18n.translate('xpack.lens.fieldFormats.longSuffix.d', { defaultMessage: 'per day' }),
};

function getSuffix(
  scale: TimeScaleUnit | undefined,
  shift: string | undefined,
  reducedTimeRange: string | undefined
) {
  return (
    (shift || scale ? ' ' : '') +
    (scale ? unitSuffixesLong[scale] : '') +
    (shift && scale ? ' ' : '') +
    (shift ? `-${shift}` : '') +
    (reducedTimeRange ? ' ' : '') +
    (reducedTimeRange
      ? i18n.translate('xpack.lens.reducedTimeRangeSuffix', {
          defaultMessage: 'last {reducedTimeRange}',
          values: { reducedTimeRange },
        })
      : '')
  );
}

export function adjustTimeScaleLabelSuffix(
  oldLabel: string,
  previousTimeScale: TimeScaleUnit | undefined,
  newTimeScale: TimeScaleUnit | undefined,
  previousShift: string | undefined,
  newShift: string | undefined,
  previousReducedTimeRange: string | undefined,
  newReducedTimeRange: string | undefined
) {
  let cleanedLabel = oldLabel;
  // remove added suffix if column had a time scale previously
  if (previousTimeScale || previousShift || previousReducedTimeRange) {
    const suffix = getSuffix(previousTimeScale, previousShift, previousReducedTimeRange);
    const suffixPosition = oldLabel.lastIndexOf(suffix);
    if (suffixPosition !== -1) {
      cleanedLabel = oldLabel.substring(0, suffixPosition);
    }
  }
  if (!newTimeScale && !newShift && !newReducedTimeRange) {
    return cleanedLabel;
  }
  // add new suffix if column has a time scale now
  return `${cleanedLabel}${getSuffix(newTimeScale, newShift, newReducedTimeRange)}`;
}
