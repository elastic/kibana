/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { type FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { type VisParams } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import React from 'react';

export interface TrendConfig {
  icon: boolean;
  value: boolean;
  palette: [string, string, string];
  baselineValue: number;
  borderColor?: string;
}

function getBadgeConfiguration(trendConfig: TrendConfig, deltaValue: number) {
  if (deltaValue < 0) {
    return {
      icon: trendConfig.icon ? 'sortDown' : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.decrease', {
        defaultMessage: 'down',
      }),
      color: trendConfig.palette[0],
    };
  }
  if (deltaValue > 0) {
    return {
      icon: trendConfig.icon ? 'sortUp' : undefined,
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.increase', {
        defaultMessage: 'up',
      }),
      color: trendConfig.palette[2],
    };
  }
  return {
    icon: trendConfig.icon ? 'minus' : undefined,
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
}: {
  rawValue?: number | string;
  formattedValue?: string;
  trendConfig?: TrendConfig;
  color?: string;
  fontSize: number;
}) {
  const { euiTheme } = useEuiTheme();
  if (rawValue == null) {
    return null;
  }

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

  if (trendConfig && typeof rawValue === 'number') {
    const deltaValue = rawValue - trendConfig.baselineValue;
    const { icon, color: trendColor, iconLabel } = getBadgeConfiguration(trendConfig, deltaValue);
    const translatedColor = getBadgeColor(trendColor, euiTheme);
    return (
      <EuiBadge
        aria-label={
          // Make the information accessible also for screen readers
          trendConfig.value
            ? undefined
            : i18n.translate('expressionMetricVis.secondaryMetric.trend', {
                defaultMessage: 'Value: {value} - trend {direction}',
                values: {
                  value: formattedValue,
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
        {trendConfig.value ? formattedValue : null}
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
        {formattedValue}
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

export function SecondaryMetric({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  color,
  fontSize,
}: SecondaryMetricProps) {
  let secondaryMetricColumn: DatatableColumn | undefined;
  let formatSecondaryMetric: ReturnType<typeof getMetricFormatter>;
  if (config.dimensions.secondaryMetric) {
    secondaryMetricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, columns);
    formatSecondaryMetric = getMetricFormatter(config.dimensions.secondaryMetric, columns);
  }
  const secondaryPrefix = config.metric.secondaryPrefix ?? secondaryMetricColumn?.name;
  const secondaryValue = secondaryMetricColumn ? row[secondaryMetricColumn.id] : undefined;

  return (
    <span>
      {secondaryPrefix}
      {secondaryPrefix ? ' ' : ''}
      <SecondaryMetricValue
        rawValue={secondaryValue}
        formattedValue={secondaryValue != null ? formatSecondaryMetric!(secondaryValue) : undefined}
        trendConfig={color ? undefined : trendConfig}
        color={color}
        fontSize={fontSize}
      />
    </span>
  );
}
