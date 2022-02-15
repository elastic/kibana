/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect } from 'react';

import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { timeFormatter } from '@elastic/charts';

import { TopNContext } from './contexts/topn';

export interface StackedBarChartProps {
  id: string;
  name: string;
  height: number;
  x: string;
  y: string;
  category: string;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  id,
  name,
  height,
  x,
  y,
  category,
}) => {
  const ctx = useContext(TopNContext);
  useEffect(() => {
    console.log(new Date().toISOString(), 'updated stacked-bar-chart');
  });
  return (
    <Chart size={{ height }}>
      <Settings showLegend={false} />
      <BarSeries
        id={id}
        name={name}
        data={ctx.samples}
        xAccessor={x}
        yAccessors={[y]}
        splitSeriesAccessors={[category]}
        stackAccessors={[category]}
      />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(0)} />
    </Chart>
  );
};
