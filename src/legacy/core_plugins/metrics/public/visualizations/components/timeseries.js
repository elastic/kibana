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
  Position,
  Settings,
  getAxisId,
} from '@elastic/charts';
import { Series } from './series';
import { GRID_LINE_CONFIG } from '../lib/config';

import '@elastic/charts/dist/style.css';

export class TimeSeries extends Component {
  state = {};

  static defaultProps = {
    legend: true,
    showGrid: true
  };

  static propTypes = {
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

  render() {
    const { mode } = this.props.yaxes[0];
    return (
      <Chart renderer="canvas" className="tvbVisTimeSeries" >
        <Settings
          showLegend={this.props.legend}
          legendPosition={this.props.legendPosition}
          onBrushEnd={this.props.onBrush}
          animateData={false}
        />

        { this.props.series.map(series => (
          <Series
            key={`${series.id}-${series.label}`}
            {...series}
            mode={mode}
          />))
        }

        { this.props.yaxes.map(({ id, position, tickFormatter, min, max }) => (
          <Axis
            key={id}
            groupId={getAxisId()}
            id={getAxisId(id)}
            position={position}
            domain={{ min, max }}
            showGridLines={this.props.showGrid}
            gridLineStyle={GRID_LINE_CONFIG}
            tickFormat={tickFormatter}
          />))
        }

        <Axis
          id={getAxisId('bottom')}
          position={Position.Bottom}
          title={this.props.xaxisLabel}
          tickFormat={this.props.xAxisFormatter}
          showGridLines={this.props.showGrid}
          gridLineStyle={GRID_LINE_CONFIG}
        />

      </Chart>
    );
  }
}
