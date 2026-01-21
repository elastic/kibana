/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { getColumnByAccessor } from '@kbn/chart-expressions-common';

import type { DimensionsVisParam, MetricVisParam } from '../../common';
import type { FormatOverrides } from './helpers';
import { getMetricFormatter } from './helpers';

const TREND_UPWARD = '\u{2191}'; // ↑
const TREND_DOWNWARD = '\u{2193}'; // ↓
const TREND_STABLE = '\u{003D}'; // =

export interface TrendConfig {
  showIcon: boolean;
  showValue: boolean;
  palette: [string, string, string];
  baselineValue: number | undefined;
  borderColor?: string;
  compareToPrimary: boolean;
}

export interface SecondaryMetricInfoArgs {
  row: DatatableRow;
  columns: DatatableColumn[];
  secondaryMetric: NonNullable<DimensionsVisParam['secondaryMetric']>;
  secondaryLabel: MetricVisParam['secondaryLabel'];
  trendConfig?: TrendConfig;
  staticColor?: string;
}

export interface SecondaryMetricInfo {
  value: string;
  label?: string;
  badgeColor?: string;
  description?: string;
  icon?: string;
}

const notAvailable = i18n.translate('expressionMetricVis.secondaryMetric.notAvailable', {
  defaultMessage: 'N/A',
});

function getEnhancedNumberSignFormatter(
  trendConfig: TrendConfig | undefined
): FormatOverrides | undefined {
  if (!trendConfig?.compareToPrimary) {
    return;
  }
  const paramsOverride = { alwaysShowSign: true };
  return {
    number: paramsOverride,
    percent: paramsOverride,
    bytes: paramsOverride,
  };
}

function getDeltaValue(rawValue: number | undefined, baselineValue: number | undefined) {
  // Return NAN delta for now if either side of the formula is not a number
  if (rawValue == null || baselineValue == null || !Number.isFinite(baselineValue)) {
    return NaN;
  }
  return rawValue - baselineValue;
}

function getBadgeConfiguration(trendConfig: TrendConfig, deltaValue: number) {
  if (Number.isNaN(deltaValue)) {
    return {
      icon: undefined,
      iconLabel: notAvailable,
      color: trendConfig.palette[1],
    };
  }

  if (deltaValue < 0) {
    return {
      icon: trendConfig.showIcon ? TREND_DOWNWARD : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.decrease', {
        defaultMessage: 'downward direction',
      }),
      color: trendConfig.palette[0],
    };
  }

  if (deltaValue > 0) {
    return {
      icon: trendConfig.showIcon ? TREND_UPWARD : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.increase', {
        defaultMessage: 'upward direction',
      }),
      color: trendConfig.palette[2],
    };
  }

  return {
    icon: trendConfig.showIcon ? TREND_STABLE : undefined,
    iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.stable', {
      defaultMessage: 'stable',
    }),
    color: trendConfig.palette[1],
  };
}

function getValueToShow(
  value: string,
  deltaValue: number,
  formatter: FieldFormatConvertFunction | undefined,
  compareToPrimary: boolean
) {
  if (!compareToPrimary) {
    return String(value);
  }

  // In comparison mode the NaN delta should be converted to N/A
  if (Number.isNaN(deltaValue)) {
    return notAvailable;
  }

  const formattedDelta = formatter ? formatter(deltaValue) : deltaValue;
  return String(formattedDelta);
}

function getTrendDescription(hasIcon: boolean, value: string, direction: string) {
  if (hasIcon) {
    return i18n.translate('expressionMetricVis.secondaryMetric.trend', {
      defaultMessage: 'Value: {value} - Changed to {direction}',
      values: {
        value,
        direction,
      },
    });
  }

  return i18n.translate('expressionMetricVis.secondaryMetric.trendnoDifferences', {
    defaultMessage: 'Value: {value} - No differences',
    values: { value },
  });
}

function getStaticColorInfo(
  formattedValue: string,
  label: string,
  staticColor: string
): SecondaryMetricInfo {
  return { value: formattedValue, label, badgeColor: staticColor };
}

function getDynamicColorInfo(
  trendConfig: TrendConfig,
  rawValue: number | undefined,
  safeFormattedValue: string,
  metricFormatter: FieldFormatConvertFunction | undefined,
  label: string
): SecondaryMetricInfo {
  const deltaFactor = trendConfig.compareToPrimary ? -1 : 1;
  const deltaValue = deltaFactor * getDeltaValue(rawValue, trendConfig.baselineValue);
  const { icon, color: trendColor, iconLabel } = getBadgeConfiguration(trendConfig, deltaValue);
  const valueToShow = getValueToShow(
    safeFormattedValue,
    deltaValue,
    metricFormatter,
    trendConfig.compareToPrimary
  );
  const trendDescription = !trendConfig.showValue
    ? getTrendDescription(!!icon, valueToShow, iconLabel)
    : undefined;

  if (trendConfig.showIcon && !trendConfig.showValue && !icon) {
    return { value: '', label: '', badgeColor: '', description: trendDescription };
  }

  return {
    value: trendConfig.showValue ? valueToShow : '',
    label,
    badgeColor: trendColor,
    description: trendDescription,
    icon: trendConfig.showIcon ? icon : undefined,
  };
}

/** Computes the display information for the Secondary Metric */
export function getSecondaryMetricInfo({
  row,
  columns,
  secondaryMetric,
  secondaryLabel,
  trendConfig,
  staticColor,
}: SecondaryMetricInfoArgs): SecondaryMetricInfo {
  const secondaryMetricColumn = getColumnByAccessor(secondaryMetric, columns);
  const secondaryMetricFormatter = getMetricFormatter(
    secondaryMetric,
    columns,
    getEnhancedNumberSignFormatter(trendConfig)
  );

  const label = secondaryLabel ?? secondaryMetricColumn?.name ?? '';

  const rawValue = secondaryMetricColumn ? row[secondaryMetricColumn.id] : undefined;
  const formattedValue = secondaryMetricFormatter(rawValue);
  const safeFormattedValue = formattedValue ?? notAvailable;

  if (staticColor) {
    return getStaticColorInfo(safeFormattedValue, label, staticColor);
  }

  const hasDynamicColor = trendConfig && (typeof rawValue === 'number' || rawValue == null);
  if (hasDynamicColor) {
    return getDynamicColorInfo(
      trendConfig,
      rawValue,
      safeFormattedValue,
      secondaryMetricFormatter,
      label
    );
  }

  return { value: formattedValue ?? '', label };
}
