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
import { EuiBadge } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { type FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { type VisParams } from '@kbn/visualizations-plugin/common';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { FormatOverrides } from './helpers';

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
      icon: trendConfig.icon ? '\u{2193}' : undefined, // ↓
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.decrease', {
        defaultMessage: 'downward direction',
      }),
      color: trendConfig.palette[0],
    };
  }
  if (deltaValue > 0) {
    return {
      icon: trendConfig.icon ? '\u{2191}' : undefined, // ↑
      iconLabel: i18n.translate('expressionMetricVis.secondaryMetric.trend.increase', {
        defaultMessage: 'upward direction',
      }),
      color: trendConfig.palette[2],
    };
  }
  return {
    icon: trendConfig.icon ? '\u{003D}' : undefined, // =
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

function getTrendDescription(
  showValue: boolean,
  hasIcon: boolean,
  value: string,
  direction: string
) {
  if (showValue) {
    return undefined;
  }
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
    values: {
      value,
    },
  });
}

function SecondaryMetricValue({
  rawValue,
  formattedValue,
  trendConfig,
  color,
  formatter,
}: {
  rawValue?: number | string;
  formattedValue?: string;
  trendConfig?: TrendConfig;
  color?: string;
  formatter?: FieldFormatConvertFunction;
}) {
  const safeFormattedValue = formattedValue ?? notAvailable;

  const badgeCss = css(`
    font-size:  inherit;
    line-height:  inherit;
    ${
      trendConfig && typeof rawValue === 'number'
        ? `border: 1px solid ${trendConfig.borderColor};`
        : ''
    }
  `);

  if (trendConfig && (typeof rawValue === 'number' || rawValue == null)) {
    // When comparing with primary metric we want to change the order of the difference (primary - secondary)
    const deltaFactor = trendConfig.compareToPrimary ? -1 : 1;
    const deltaValue = deltaFactor * getDeltaValue(rawValue, trendConfig.baselineValue);
    const { icon, color: trendColor, iconLabel } = getBadgeConfiguration(trendConfig, deltaValue);
    const valueToShow = getValueToShow(
      safeFormattedValue,
      deltaValue,
      formatter,
      trendConfig.compareToPrimary
    );
    // If no value is shown and no icon should be shown (i.e. N/A) then do not render the badge at all
    if (trendConfig.icon && !trendConfig.value && !icon) {
      return (
        <span
          data-test-subj={`expressionMetricVis-secondaryMetric-badge-${rawValue}`}
          aria-label={getTrendDescription(trendConfig.value, icon != null, valueToShow, iconLabel)}
        />
      );
    }
    return (
      <EuiBadge
        aria-label={
          // Make the information accessible also for screen readers
          // so show it only when icon only mode to avoid to be reduntant
          getTrendDescription(trendConfig.value, icon != null, valueToShow, iconLabel)
        }
        color={trendColor}
        data-test-subj={`expressionMetricVis-secondaryMetric-badge-${rawValue}`}
        css={badgeCss}
      >
        {trendConfig.value ? valueToShow : null}
        {trendConfig.value && trendConfig.icon && icon ? ' ' : ''}
        {trendConfig.icon && icon ? icon : null}
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
  getMetricFormatter: (
    accessor: string,
    columns: DatatableColumn[],
    formatOverrides?: FormatOverrides | undefined
  ) => FieldFormatConvertFunction;
}

function getMetricColumnAndFormatter(
  columns: SecondaryMetricProps['columns'],
  config: SecondaryMetricProps['config'],
  getMetricFormatter: SecondaryMetricProps['getMetricFormatter'],
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

export function SecondaryMetric({
  columns,
  row,
  config,
  getMetricFormatter,
  trendConfig,
  color,
}: SecondaryMetricProps) {
  const { metricFormatter, metricColumn } =
    getMetricColumnAndFormatter(
      columns,
      config,
      getMetricFormatter,
      getEnhancedNumberSignFormatter(trendConfig)
    ) || {};
  const prefix = config.metric.secondaryPrefix ?? metricColumn?.name;
  const value = metricColumn ? row[metricColumn.id] : undefined;

  return (
    <span css={styles.wrapper} data-test-subj="metric-secondary-element">
      {prefix && <span css={styles.prefix}>{prefix}</span>}
      <span css={styles.value}>
        <SecondaryMetricValue
          rawValue={value}
          formattedValue={metricFormatter?.(value)}
          trendConfig={color ? undefined : trendConfig}
          color={color}
          formatter={metricFormatter}
        />
      </span>
    </span>
  );
}

const styles = {
  wrapper: css({
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    width: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }),
  prefix: css({
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  value: css({
    display: 'inline-flex',
    flex: '1 0 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    marginLeft: 4,
    maxWidth: 'calc(100% - 4px)', // Subtract the marginLeft value
  }),
};
