/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
interface BarChartRaceProps {
  entities: Record<string, number>;
}

export const BarChartRace: FC<BarChartRaceProps> = ({ entities }) => {
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <div style={{ height: '300px' }}>
      <Chart>
        <Settings baseTheme={chartBaseTheme} rotation={90} />
        <Axis id="entities" position={Position.Bottom} title="Commits" showOverlappingTicks />
        <Axis id="left2" title="Developers" position={Position.Left} />

        <BarSeries
          id="commits"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={Object.entries(entities)
            .map(([x, y]) => {
              return {
                x,
                y,
              };
            })
            .sort((a, b) => b.y - a.y)}
        />
      </Chart>
    </div>
  );
};
