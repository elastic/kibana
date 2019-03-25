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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Axis,
  Chart,
  getSpecId,
  LineSeries,
  ScaleType,
  Position,
  Settings,
  getAxisId,
  CurveType
} from '@elastic/charts';
import { GRID_LINE_CONFIG } from '../lib/config';
import { calculateFillColor } from '../lib/calculate_fill_color';

import '@elastic/charts/dist/style.css';

export class TimeSeries extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  computeColor(color, fill) {
    const { fillColor } = calculateFillColor(color, fill);

    return fillColor;
  }

  render() {
    const { min, max, mode } = this.props.yaxes[0];
    let leftDomain;
    if (min && max) leftDomain = { min, max };

    return (
      <Chart renderer="canvas" className="tvbVisTimeSeries" >
        <Settings
          showLegend={this.props.legend}
          legendPosition={this.props.legendPosition}
          onBrushEnd={this.props.onBrush}
        />
        {
          this.props.series.map(({ id, label, data, bars, lines, color }) => {
            const lineCustomSeriesColors = new Map();
            const lineDataSeriesColorValues = {
              colorValues: [],
              specId: getSpecId(label),
            };

            const { fill } = bars;
            const { steps } = lines;

            lineCustomSeriesColors.set(lineDataSeriesColorValues, this.computeColor(color, fill));

            return (
              <LineSeries
                key={`${id}-${label}`}
                id={getSpecId(label)}
                seriesType={bars.show ? 'bar' : 'line'}
                xScaleType={ScaleType.Time}
                yScaleType={mode || ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1]}
                data={data}
                yScaleToDataExtent={false}
                customSeriesColors={lineCustomSeriesColors}
                curve={steps ? CurveType.CURVE_STEP : CurveType.LINEAR}
              />
            );
          })
        }
        <Axis
          id={getAxisId('bottom')}
          position={Position.Bottom}
          title={this.props.xaxisLabel}
          tickFormat={this.props.xAxisFormatter}
          showGridLines={this.props.showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
        />
        <Axis
          id={getAxisId('yaxis')}
          position={this.props.axisPosition}
          domain={leftDomain}
          showGridLines={this.props.showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
        />
      </Chart>
    );
  }
}

TimeSeries.defaultProps = {
  legend: true,
  showGrid: true
};

TimeSeries.propTypes = {
  legend: PropTypes.bool,
  legendPosition: PropTypes.string,
  axisPosition: PropTypes.string,
  onFilter: PropTypes.func,
  series: PropTypes.array,
  tickFormatter: PropTypes.func,
  showGrid: PropTypes.bool,
  xaxisLabel: PropTypes.string,
  dateFormat: PropTypes.string
};
