/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';

import type { PartialTheme } from '@elastic/charts';
import { Chart, BarSeries, ScaleType, Settings, Tooltip, TooltipType } from '@elastic/charts';

import { useLogRateAnalysisBarColors } from '@kbn/aiops-log-rate-analysis';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';

interface SparklineChartProps {
  charts: ChartsPluginStart;
  values?: number[];
  rowHeight: number;
}
const miniHistogramChartTheme: PartialTheme = {
  chartMargins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: {
    barsPadding: 0.1,
  },
  background: {
    color: 'transparent',
  },
};

export const SparklineChart: FC<SparklineChartProps> = ({ values, charts, rowHeight }) => {
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const barColors = useLogRateAnalysisBarColors();

  const cssChartSize = css({
    width: '100%',
    height: `${rowHeight * 14}px`,
    margin: '0px',
  });

  const chartData = useMemo(
    () => values?.map((value, index) => ({ key: index, value })) ?? [],
    [values]
  );

  if (Array.isArray(values) === false || values.length === 0) {
    return values;
  }

  return (
    <div css={cssChartSize}>
      <Chart>
        <Tooltip type={TooltipType.None} />
        <Settings
          theme={[miniHistogramChartTheme]}
          baseTheme={chartBaseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <BarSeries
          id="doc_count_overall"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['value']}
          data={chartData}
          stackAccessors={[0]}
          color={barColors.barColor}
        />
      </Chart>
    </div>
  );
};
