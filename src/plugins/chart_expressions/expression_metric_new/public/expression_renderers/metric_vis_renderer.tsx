/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { Chart, Metric, MetricSpec, Settings } from '@elastic/charts';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { EXPRESSION_METRIC_NAME, MetricVisRenderConfig } from '../../common';
import { getThemeService } from '../services/theme_service';

const MetricVis = ({
  data,
  themeService,
}: {
  data: MetricSpec['data'];
  themeService: ChartsPluginSetup['theme'];
}) => {
  const chartTheme = themeService.useChartsTheme();
  return (
    <Chart>
      <Settings theme={[{ background: { color: 'transparent' } }, chartTheme]} />
      <Metric id="metric" data={data} />
    </Chart>
  );
};

export const getMetricVisRenderer = (
  theme: ThemeServiceStart
): (() => ExpressionRenderDefinition<MetricVisRenderConfig>) => {
  return () => ({
    name: EXPRESSION_METRIC_NAME,
    displayName: 'metric visualization',
    reuseDomNode: true,
    render: async (domNode, { visData, visConfig }, handlers) => {
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      const primaryMetricColumn = getColumnByAccessor(
        visConfig.dimensions.metric,
        visData.columns
      )!;

      const secondaryMetricColumn = visConfig.dimensions.secondaryMetric
        ? getColumnByAccessor(visConfig.dimensions.secondaryMetric, visData.columns)
        : undefined;

      const breakdownByColumn = visConfig.dimensions.breakdownBy
        ? getColumnByAccessor(visConfig.dimensions.breakdownBy, visData.columns)
        : undefined;

      const extraText = secondaryMetricColumn
        ? visData.rows[0][secondaryMetricColumn.id]
        : visConfig.metric.extraText;

      const formatValue = (val: unknown) => String(val);

      const data = [];

      const commonProps = {
        color: '#5e5e5e',
        valueFormatter: formatValue,
        domain: { min: visConfig.metric.progressMin, max: visConfig.metric.progressMax },
        progressBarDirection: visConfig.metric.progressDirection,
        extra: <span>{extraText}</span>,
      };

      if (!breakdownByColumn) {
        data.push({
          ...commonProps,
          // TODO - what if no rows?
          value: visData.rows[0][primaryMetricColumn.id],
          title: primaryMetricColumn.name,
          subtitle: secondaryMetricColumn?.name ?? visConfig.metric.subtitle,
        });
      }

      if (breakdownByColumn) {
        // TODO - what if no rows?
        for (const row of visData.rows) {
          data.push({
            ...commonProps,
            value: row[primaryMetricColumn.id],
            title: row[breakdownByColumn.id],
            subtitle: primaryMetricColumn.name,
          });
        }
      }

      const gridData = [];
      const {
        metric: { maxCols },
      } = visConfig;
      for (let i = 0; i < data.length; i += maxCols) {
        gridData.push(data.slice(i, i + maxCols));
      }

      const themeService = getThemeService();

      render(
        <KibanaThemeProvider theme$={theme.theme$}>
          <MetricVis data={gridData} themeService={themeService} />
        </KibanaThemeProvider>,
        domNode
      );
    },
  });
};
