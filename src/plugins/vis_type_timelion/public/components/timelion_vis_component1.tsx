/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from 'react';
import { cloneDeep } from 'lodash';
import {
  AreaSeries,
  BarSeries,
  LineSeries,
  Chart,
  ScaleType,
  Settings,
  Position,
  Axis,
} from '@elastic/charts';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { useKibana } from '../../../kibana_react/public';

import { buildOptions, colors } from '../helpers/panel_utils';

import { Series, Sheet } from '../helpers/timelion_request_handler';
import { getBarStyles, getAreaStyles } from '../helpers/series_styles';
import { TimelionVisDependencies } from '../plugin';

import './index.scss';

interface TimelionVisComponentProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  interval: string;
  seriesList: Sheet;
  renderComplete: IInterpreterRenderHandlers['done'];
}

function TimelionVisComponent1({
  interval,
  seriesList,
  renderComplete,
  fireEvent,
}: TimelionVisComponentProps) {
  const kibana = useKibana<TimelionVisDependencies>();
  const [chart, setChart] = useState(() => cloneDeep(seriesList.list));
  const options = buildOptions(
    interval,
    kibana.services.timefilter,
    kibana.services.uiSettings,
    400
  );

  useEffect(() => {
    const colorsSet: Array<[Series, string]> = [];
    const newChart = seriesList.list.map((series: Series, seriesIndex: number) => {
      const newSeries = { ...series };
      if (!newSeries.color) {
        const colorIndex = seriesIndex % colors.length;
        newSeries.color = colors[colorIndex];
      }
      colorsSet.push([newSeries, newSeries.color]);
      return newSeries;
    });
    setChart(newChart);
  }, [seriesList.list]);

  const getLegendPosition = function (chartGlobal: any) {
    if (chartGlobal && chartGlobal.legend) {
      switch (chartGlobal.legend.position) {
        case 'ne':
          return Position.Right;
        case 'nw':
          return Position.Left;
        case 'se':
          return Position.Right;
        case 'sw':
          return Position.Left;
      }
    }
    return Position.Left;
  };

  return (
    <Chart renderer="canvas" className="timelionChart" size={{ width: '100%' }}>
      <Settings showLegend legendPosition={getLegendPosition(chart[0]._global)} />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={options.xaxis.tickFormatter}
      />
      {chart[0]._global && chart[0]._global.yaxes ? (
        chart[0]._global.yaxes.map((data, index) => {
          return (
            <Axis
              key={data.position + index}
              id={data.position + data.axisLabel}
              title={data.axisLabel}
              position={data.position}
              gridLine={{
                stroke: 'rgba(125,125,125,0.1)',
                visible: true,
              }}
            />
          );
        })
      ) : (
        <Axis
          id="left"
          position={Position.Left}
          gridLine={{
            stroke: 'rgba(125,125,125,0.1)',
            visible: true,
          }}
        />
      )}
      {chart.map((data, index) => {
        if (data.bars) {
          return (
            <BarSeries
              key={data.label + index}
              id={data.label}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              data={data.data}
              {...getBarStyles(data.bars, data.color)}
            />
          );
        } else if (data.lines) {
          return (
            <AreaSeries
              key={data.label + index}
              id={data.label}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              data={data.data}
              {...getAreaStyles(data)}
            />
          );
        } else {
          return (
            <LineSeries
              key={data.label + index}
              id={data.label}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              data={data.data}
            />
          );
        }
      })}
    </Chart>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimelionVisComponent1 as default };
