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
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { VisParams } from '@kbn/visualizations-plugin/common';

import type { FormatOverrides } from './helpers';

export interface TrendConfig {
  showIcon: boolean;
  showValue: boolean;
  palette: [string, string, string];
  baselineValue: number | undefined;
  borderColor?: string;
  compareToPrimary: boolean;
}

export interface SecondaryMetricInfoArgs {
  columns: DatatableColumn[];
  row: DatatableRow;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  getMetricFormatter: (
    accessor: string,
    columns: DatatableColumn[],
    formatOverrides?: FormatOverrides | undefined
  ) => FieldFormatConvertFunction;
  trendConfig?: TrendConfig;
  staticColor?: string;
}

export interface SecondaryMetricInfo {
  value: string;
  label?: string;
  badgeColor?: string;
  description?: string;
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

function getMetricColumnAndFormatter(
  columns: SecondaryMetricInfoArgs['columns'],
  config: SecondaryMetricInfoArgs['config'],
  getMetricFormatter: SecondaryMetricInfoArgs['getMetricFormatter'],
  formatOverrides: FormatOverrides | undefined
) {
  if (!config.dimensions.secondaryMetric) {
    return;
  }
  return {
    metricColumn: getColumnByAccessor(config.dimensions.secondaryMetric, columns),
    metricFormatter: getMetricFormatter(
      config.dimensions.secondaryMetric,
      columns,
      formatOverrides
    ),
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
      icon: trendConfig.showIcon ? '\u{2193}' : undefined, // ↓
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.decrease', {
        defaultMessage: 'downward direction',
      }),
      color: trendConfig.palette[0],
    };
  }

  if (deltaValue > 0) {
    return {
      icon: trendConfig.showIcon ? '\u{2191}' : undefined, // ↑
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.increase', {
        defaultMessage: 'upward direction',
      }),
      color: trendConfig.palette[2],
    };
  }

  return {
    icon: trendConfig.showIcon ? '\u{003D}' : undefined, // =
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
  // In comparison mode the NaN delta should be converted to N/A
  if (compareToPrimary) {
    if (Number.isNaN(deltaValue)) {
      return notAvailable;
    }
    return formatter?.(deltaValue) ?? String(deltaValue);
  }
  return String(value);
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

  const valueContent = `${trendConfig.showValue ? valueToShow : ''}${
    trendConfig.showValue && trendConfig.showIcon && icon ? ' ' : ''
  }${trendConfig.showIcon && icon ? icon : ''}`;

  return { value: valueContent, label, badgeColor: trendColor, description: trendDescription };
}

/**
 * Computes the display information for the secondary metric
 * @returns An object with value, label, badgeColor and description for rendering.
 */
export function getSecondaryMetricInfo({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  staticColor,
}: SecondaryMetricInfoArgs): SecondaryMetricInfo {
  const formatOverrides = getEnhancedNumberSignFormatter(trendConfig);
  const { metricFormatter, metricColumn } =
    getMetricColumnAndFormatter(columns, config, getMetricFormatter, formatOverrides) || {};

  const label = config.metric.secondaryPrefix ?? metricColumn?.name; // prefix

  const rawValue = metricColumn ? row[metricColumn.id] : undefined;
  const formattedValue = metricFormatter?.(rawValue);
  const safeFormattedValue = formattedValue ?? notAvailable;

  if (staticColor) {
    return getStaticColorInfo(safeFormattedValue, label, staticColor);
  }

  const hasDynamicColor = trendConfig && (typeof rawValue === 'number' || rawValue == null);
  if (hasDynamicColor) {
    return getDynamicColorInfo(trendConfig, rawValue, safeFormattedValue, metricFormatter, label);
  }

  return { value: formattedValue ?? '', label };
}
