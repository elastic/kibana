/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { Chart, Metric, MetricSpec, RenderChangeListener, Settings } from '@elastic/charts';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { Datatable, IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import { VisParams } from '../../common';
import { getThemeService } from '../services/theme_service';
import { getPaletteService } from '../services';

// TODO - find a reasonable default (from EUI perhaps?)
const defaultColor = '#5e5e5e';

const maxDecimals = 3;

const formatValue = (val: unknown) => String(Number(val).toFixed(maxDecimals));

const getColor = (value: number, paletteParams: CustomPaletteState | undefined) =>
  paletteParams
    ? getPaletteService().get('custom')?.getColorForValue?.(value, paletteParams, {
        min: paletteParams.rangeMin,
        max: paletteParams.rangeMax,
      }) || defaultColor
    : defaultColor;

const MetricVis = ({
  data,
  config,
  renderComplete,
}: {
  data: Datatable;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  renderComplete: IInterpreterRenderHandlers['done'];
}) => {
  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const primaryMetricColumn = getColumnByAccessor(config.dimensions.metric, data.columns)!;

  const secondaryMetricColumn = config.dimensions.secondaryMetric
    ? getColumnByAccessor(config.dimensions.secondaryMetric, data.columns)
    : undefined;

  const breakdownByColumn = config.dimensions.breakdownBy
    ? getColumnByAccessor(config.dimensions.breakdownBy, data.columns)
    : undefined;

  const metricConfigs: MetricSpec['data'][number] = [];

  const useProgressBar =
    typeof config.metric.progressMin === 'number' && typeof config.metric.progressMax === 'number';

  const commonProps = {
    valueFormatter: formatValue,
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
            ? formatValue(data.rows[0][secondaryMetricColumn.id])
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
              ? formatValue(row[secondaryMetricColumn.id])
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
export { MetricVis as default };
