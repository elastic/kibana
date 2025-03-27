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
import { enforceColorContrast } from '@kbn/coloring';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { type FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
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

export function getContrastColor(
  color: string,
  isDarkTheme: boolean,
  darkTextProp: 'euiColorInk' | 'euiTextColor' = 'euiColorInk',
  lightTextProp: 'euiColorGhost' | 'euiTextColor' = 'euiColorGhost'
) {
  // when in light theme both text color and colorInk are dark and the choice
  // may depends on the specific context.
  const darkColor = isDarkTheme ? euiDarkVars.euiColorInk : euiLightVars[darkTextProp];
  // Same thing for light color in dark theme
  const lightColor = isDarkTheme ? euiDarkVars[lightTextProp] : euiLightVars.euiColorGhost;
  const backgroundColor = isDarkTheme
    ? euiDarkVars.euiPageBackgroundColor
    : euiLightVars.euiPageBackgroundColor;
  return enforceColorContrast(color, backgroundColor) ? lightColor : darkColor;
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
}: {
  rawValue?: number | string;
  formattedValue?: string;
  trendConfig?: TrendConfig;
  color?: string;
}) {
  const { euiTheme } = useEuiTheme();
  if (rawValue == null) {
    return null;
  }

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
        css={css(`
          font-size: inherit;
          line-height: inherit;
          ${trendConfig.borderColor ? `border: 1px solid ${trendConfig.borderColor};` : ''}

          // Follow the Elastic Charts breakpoint font size
          // See ref: https://github.com/elastic/elastic-charts/blob/main/packages/charts/src/chart_types/metric/renderer/dom/text_measurements.tsx#L67
        // @TODO: remove this once the Elastic charts render props for extra is in
          @container  (min-height: 100px) {
            svg {
              inline-size: 16px !important;
              block-size: 16px !important;
            }
          }

          @container  (min-height: 200px) {
            svg {
              inline-size: 16px !important;
              block-size: 16px !important;
            }
          }

          @container  (min-height: 300px) {
            svg {
              inline-size: 24px !important;
              block-size: 24px !important;
            }
          }

           @container  (min-height: 400px) {
            svg {
              inline-size: 24px !important;
              block-size: 24px !important;
            }
          }

          @container  (min-height: 500px) {
            svg {
              inline-size: 32px !important;
              block-size: 32px !important;
            }
          }

          @container  (min-height: 600px) {
            svg {
              inline-size: 42px !important;
              block-size: 42px !important;
            }
          }
          
        `)}
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
  getMetricFormatter: (accessor: string, columns: DatatableColumn[]) => FieldFormatConvertFunction;
}

export function SecondaryMetric({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  color,
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
      />
    </span>
  );
}
