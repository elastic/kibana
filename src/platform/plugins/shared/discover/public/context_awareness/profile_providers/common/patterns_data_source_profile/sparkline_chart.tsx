/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import type { PartialTheme } from '@elastic/charts';
import { Chart, BarSeries, ScaleType, Settings, Tooltip, TooltipType } from '@elastic/charts';

import { useLogRateAnalysisBarColors } from '@kbn/aiops-log-rate-analysis';
import { i18n } from '@kbn/i18n';
import type { ProfileProviderServices } from '../..';

interface SparklineChartProps {
  services: ProfileProviderServices;
  values?: number[];
  rowHeight: number;
}

export const SparklineChart: FC<SparklineChartProps> = ({ values, services, rowHeight }) => {
  const { charts } = services;
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const barColors = useLogRateAnalysisBarColors();

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

  const cssChartSize = css({
    width: '100%',
    height: `${rowHeight * 14}px`,
    margin: '0px',
  });

  if (!values || values.length === 0 || Array.isArray(values) === false) {
    return values;
  }

  const chartData = values.map((value, index) => ({ key: index, value }));

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
          // Defaults to multi layer time axis as of Elastic Charts v70
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
