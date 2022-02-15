/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';

import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { timeFormatter } from '@elastic/charts';

export interface BarChartProps {
  id: string;
  name: string;
  height: number;
  data: any[];
  x: string;
  y: string;
}

export const BarChart: React.FC<BarChartProps> = ({ id, name, height, data, x, y }) => {
  useEffect(() => {
    console.log(new Date().toISOString(), 'updated bar-chart');
  });

  return (
    <Chart size={{ height }}>
      <Settings showLegend={false} />
      <BarSeries id={id} name={name} data={data} xScaleType="time" xAccessor={0} yAccessors={[1]} />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(0)} />
    </Chart>
  );
};
