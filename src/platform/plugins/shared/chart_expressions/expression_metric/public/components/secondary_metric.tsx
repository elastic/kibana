/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBadge, EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { type FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { type VisParams } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';

export interface TrendConfig {
  icon: boolean;
  value: boolean;
  palette: [string, string, string];
  baselineValue: number | undefined;
  borderColor?: string;
  compareToPrimary: boolean;
}

const notAvailable = i18n.translate('expressionMetricVis.secondaryMetric.notAvailable', {
  defaultMessage: 'N/A',
});

function getDeltaValue(rawValue: number | undefined, baselineValue: number | undefined) {
  // Return 0 delta for now if either side of the formula is not a number
  if (rawValue == null || baselineValue == null || Number.isNaN(baselineValue)) {
    return 0;
  }
  return rawValue - baselineValue;
}

function getBadgeConfiguration(trendConfig: TrendConfig, deltaValue: number) {
  if (deltaValue < 0) {
    return {
      icon: trendConfig.icon ? 'sortDown' : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.decrease', {
        defaultMessage: 'downward direction',
      }),
      color: trendConfig.palette[0],
    };
  }
  if (deltaValue > 0) {
    return {
      icon: trendConfig.icon ? 'sortUp' : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.increase', {
        defaultMessage: 'upward direction',
      }),
      color: trendConfig.palette[2],
    };
  }
  return {
    icon: trendConfig.icon ? 'grab' : undefined,
    iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.stable', {
      defaultMessage: 'stable',
    }),
    color: trendConfig.palette[1],
  };
}

const badgeSupportedTokens = new Set([
  'default',
  'hollow',
  'primary',
  'success',
  'accent',
  'warning',
  'danger',
]);

function getBadgeColor(color: string, euiTheme: EuiThemeComputed<{}>) {
  if (color === 'backgroundBaseDisabled') {
    return 'default';
  }
  if (badgeSupportedTokens.has(color)) {
    return color;
  }
  return (
    euiTheme.colors[color as Exclude<keyof typeof euiTheme.colors, 'vis' | 'DARK' | 'LIGHT'>] ||
    euiTheme.colors.vis[color as keyof typeof euiTheme.colors.vis] ||
    color
  );
}

function SecondaryMetricValue({
  rawValue,
  formattedValue,
  trendConfig,
  color,
  fontSize,
  formatter,
}: {
  rawValue?: number | string;
  formattedValue?: string;
  trendConfig?: TrendConfig;
  color?: string;
  fontSize: number;
  formatter?: FieldFormatConvertFunction;
}) {
  const { euiTheme } = useEuiTheme();
  const safeFormattedValue = formattedValue ?? notAvailable;

  const badgeCss = css(`
    font-size:  inherit;
    line-height:  inherit;
    ${
      trendConfig && typeof rawValue === 'number'
        ? `border: 1px solid ${trendConfig.borderColor};`
        : ''
    }
    svg {
        inline-size: ${fontSize}px !important;
        block-size: ${fontSize}px !important;
    }
  `);

  if (trendConfig && (typeof rawValue === 'number' || rawValue == null)) {
    const deltaValue = getDeltaValue(rawValue, trendConfig.baselineValue);
    const { icon, color: trendColor, iconLabel } = getBadgeConfiguration(trendConfig, deltaValue);
    const translatedColor = getBadgeColor(trendColor, euiTheme);
    const valueToShow = trendConfig.compareToPrimary
      ? formatter?.(deltaValue) ?? deltaValue
      : safeFormattedValue;
    return (
      <EuiBadge
        aria-label={
          // Make the information accessible also for screen readers
          // so show it only when icon only mode to avoid to be reduntant
          trendConfig.value
            ? undefined
            : i18n.translate('expressionMetricVis.secondaryMetric.trend', {
                defaultMessage: 'Value: {value} - Changed to {direction}',
                values: {
                  value: valueToShow,
                  direction: iconLabel,
                },
              })
        }
        iconType={icon}
        iconSide="left"
        color={translatedColor}
        data-test-subj={`expressionMetricVis-secondaryMetric-badge-${rawValue}`}
        css={badgeCss}
      >
        {trendConfig.value ? valueToShow : null}
      </EuiBadge>
    );
  }
  if (color) {
    return (
      <EuiBadge
        color={color}
        data-test-subj={`expressionMetricVis-secondaryMetric-badge-${rawValue}`}
        css={badgeCss}
      >
        {safeFormattedValue}
      </EuiBadge>
    );
  }
  return formattedValue;
}

export interface SecondaryMetricProps {
  columns: DatatableColumn[];
  row: DatatableRow;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  trendConfig?: TrendConfig;
  color?: string;
  fontSize: number;
  getMetricFormatter: (accessor: string, columns: DatatableColumn[]) => FieldFormatConvertFunction;
}

function getMetricColumnAndFormatter(
  columns: SecondaryMetricProps['columns'],
  config: SecondaryMetricProps['config'],
  getMetricFormatter: SecondaryMetricProps['getMetricFormatter']
) {
  let metricColumn: DatatableColumn | undefined;
  let metricFormatter: ReturnType<typeof getMetricFormatter> | undefined;
  if (config.dimensions.secondaryMetric) {
    metricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, columns);
    metricFormatter = getMetricFormatter(config.dimensions.secondaryMetric, columns);
  }
  return { metricFormatter, metricColumn };
}

export function SecondaryMetric({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  color,
  fontSize,
}: SecondaryMetricProps) {
  const { metricFormatter, metricColumn } = getMetricColumnAndFormatter(
    columns,
    config,
    getMetricFormatter
  );
  const prefix = config.metric.secondaryPrefix ?? metricColumn?.name;
  const value = metricColumn ? row[metricColumn.id] : undefined;

  return (
    <span data-test-subj="metric-secondary-element">
      {prefix}
      {prefix ? ' ' : ''}
      <SecondaryMetricValue
        rawValue={value}
        formattedValue={value != null ? metricFormatter!(value) : undefined}
        trendConfig={color ? undefined : trendConfig}
        color={color}
        fontSize={fontSize}
        formatter={metricFormatter}
      />
    </span>
  );
}
