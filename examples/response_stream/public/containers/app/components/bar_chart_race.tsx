/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';

import {
  Chart,
  Settings,
  Axis,
  BarSeries,
  Position,
  ScaleType,
  LEGACY_LIGHT_THEME,
} from '@elastic/charts';

interface BarChartRaceProps {
  entities: Record<string, number>;
}

export const BarChartRace: FC<BarChartRaceProps> = ({ entities }) => {
  return (
    <div style={{ height: '300px' }}>
      <Chart>
        <Settings
          // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
          baseTheme={LEGACY_LIGHT_THEME}
          rotation={90}
        />
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
