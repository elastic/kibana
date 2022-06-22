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
import { VisParams } from '../../common';
import { getThemeService } from '../services/theme_service';

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

  const extraText = secondaryMetricColumn
    ? data.rows[0][secondaryMetricColumn.id]
    : config.metric.extraText;

  const formatValue = (val: unknown) => String(val);

  const metricConfigs: MetricSpec['data'][number] = [];

  const commonProps = {
    color: '#5e5e5e',
    valueFormatter: formatValue,
    domain: { min: config.metric.progressMin, max: config.metric.progressMax },
    progressBarDirection: config.metric.progressDirection,
    extra: <span>{extraText}</span>,
  };

  if (!breakdownByColumn) {
    metricConfigs.push({
      ...commonProps,
      value: data.rows[0][primaryMetricColumn.id],
      title: primaryMetricColumn.name,
      subtitle: secondaryMetricColumn?.name ?? config.metric.subtitle,
    });
  }

  if (breakdownByColumn) {
    for (const row of data.rows) {
      metricConfigs.push({
        ...commonProps,
        value: row[primaryMetricColumn.id],
        title: row[breakdownByColumn.id],
        subtitle: primaryMetricColumn.name,
      });
    }
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
