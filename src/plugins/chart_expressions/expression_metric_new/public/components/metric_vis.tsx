/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { Chart, Metric, MetricSpec, RenderChangeListener, Settings } from '@elastic/charts';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { Datatable, IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import { VisParams } from '../../common';
import { getPaletteService, getThemeService } from '../services';
import { currencyCodeMap } from './currency_code_map';

// TODO - find a reasonable default (from EUI perhaps?)
const defaultColor = '#5e5e5e';

const getFormatter = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns']
) => {
  const formatId = getFormatByAccessor(accessor, columns)?.id ?? 'number';
  if (!['number', 'currency', 'percent', 'bytes', 'duration'].includes(formatId)) {
    throw new Error(
      i18n.translate('newMetricVis.errors.unsupportedColumnFormat', {
        defaultMessage: 'Metric Visualization - Unsupported column format: "{id}"',
        values: {
          id: formatId,
        },
      })
    );
  }

  const locale = String(numeral.language());

  const intlOptions: Intl.NumberFormatOptions = {};

  if (formatId !== 'duration') {
    intlOptions.maximumFractionDigits = 2;
  }

  if (['number', 'currency', 'percent'].includes(formatId)) {
    intlOptions.notation = 'compact';
  }

  if (formatId === 'currency') {
    const {
      currency: { symbol: currencySymbol },
      // @ts-expect-error
    } = numeral.languageData();

    intlOptions.currency = currencyCodeMap[`${locale}-${currencySymbol}`.toLowerCase()];
    intlOptions.style = 'currency';
  }

  if (formatId === 'percent') {
    intlOptions.style = 'percent';
  }

  return new Intl.NumberFormat(locale, intlOptions).format;
};

const getColor = (value: number, paletteParams: CustomPaletteState | undefined) =>
  paletteParams
    ? getPaletteService().get('custom')?.getColorForValue?.(value, paletteParams, {
        min: paletteParams.rangeMin,
        max: paletteParams.rangeMax,
      }) || defaultColor
    : defaultColor;

export interface MetricVisComponentProps {
  data: Datatable;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  renderComplete: IInterpreterRenderHandlers['done'];
}

const MetricVisComponent = ({ data, config, renderComplete }: MetricVisComponentProps) => {
  const primaryMetricColumn = getColumnByAccessor(config.dimensions.metric, data.columns)!;
  const formatPrimaryMetric = getFormatter(config.dimensions.metric, data.columns);

  let secondaryMetricColumn;
  let formatSecondaryMetric: ReturnType<typeof getFormatter>;
  if (config.dimensions.secondaryMetric) {
    secondaryMetricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, data.columns);
    formatSecondaryMetric = getFormatter(config.dimensions.secondaryMetric, data.columns);
  }

  const breakdownByColumn = config.dimensions.breakdownBy
    ? getColumnByAccessor(config.dimensions.breakdownBy, data.columns)
    : undefined;

  const metricConfigs: MetricSpec['data'][number] = [];

  const useProgressBar =
    typeof config.metric.progressMin === 'number' && typeof config.metric.progressMax === 'number';

  const commonProps = {
    valueFormatter: formatPrimaryMetric,
    ...(useProgressBar
      ? {
          domain: { min: config.metric.progressMin, max: config.metric.progressMax },
          progressBarDirection: config.metric.progressDirection,
        }
      : {}),
  };

  if (!breakdownByColumn) {
    const value = data.rows[0][primaryMetricColumn.id];

    metricConfigs.push({
      ...commonProps,
      value,
      title: primaryMetricColumn.name,
      subtitle: secondaryMetricColumn?.name ?? config.metric.subtitle,
      extra: (
        <span>
          {secondaryMetricColumn
            ? formatSecondaryMetric!(data.rows[0][secondaryMetricColumn.id])
            : config.metric.extraText}
        </span>
      ),
      color: getColor(value, config.metric.palette),
    });
  }

  if (breakdownByColumn) {
    for (const row of data.rows) {
      const value = row[primaryMetricColumn.id];

      metricConfigs.push({
        ...commonProps,
        value,
        title: row[breakdownByColumn.id],
        subtitle: primaryMetricColumn.name,
        extra: (
          <span>
            {secondaryMetricColumn
              ? formatSecondaryMetric!(row[secondaryMetricColumn.id])
              : config.metric.extraText}
          </span>
        ),
        color: getColor(value, config.metric.palette),
      });
    }
  }

  if (config.metric.minTiles) {
    while (metricConfigs.length < config.metric.minTiles) metricConfigs.push(undefined);
  }

  const grid: MetricSpec['data'] = [];
  const {
    metric: { maxCols },
  } = config;
  for (let i = 0; i < metricConfigs.length; i += maxCols) {
    grid.push(metricConfigs.slice(i, i + maxCols));
  }

  const chartTheme = getThemeService().useChartsTheme();
  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  return (
    <Chart>
      <Settings
        theme={[{ background: { color: 'transparent' } }, chartTheme]}
        onRenderChange={onRenderChange}
      />
      <Metric id="metric" data={grid} />
    </Chart>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MetricVisComponent as default };
