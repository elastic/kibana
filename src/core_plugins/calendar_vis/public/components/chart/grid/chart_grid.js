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

import React from 'react';
import d3 from 'd3';
import _ from 'lodash';
import moment from 'moment';
import { GridConfig } from './grid_config';
import { VIS_CHART_TYPE } from '../../../lib';
import { getMonthInterval, getTimeFormat } from '../../../utils';

export class ChartGrid extends React.Component {
  constructor(props) {
    super(props);
    const { gridConfig } = this.props;
    this.gridConfig = new GridConfig(gridConfig);
    this.chartGrid = React.createRef();
  }

  componentDidMount() {
    this._render(this.props.vislibData);
  }

  render() {
    return (
      <svg id="all-days" ref={this.chartGrid} />
    );
  }

  async _render(vislibData) {

    const [cellSize, xOffset, yOffset] = this.gridConfig.get(['cellSize', 'xOffset', 'yOffset']);
    const { series } = vislibData;

    const wrapper = {
      year: moment(series[0].values[0].x).format('YYYY'),
      aggs: series[0].values,
      cellSize: cellSize,
      xOffset: xOffset,
      yOffset: yOffset
    };

    const renderGrid = this._drawGrid(this.chartGrid.current, wrapper);
    await renderGrid;
  }

  _getMonthInterval(values) {
    const startDate = _.head(values).x;
    const endDate = _.last(values).x;
    return getMonthInterval(startDate, endDate);
  }

  async _drawGrid(svg, { year, aggs, cellSize, xOffset, yOffset }) {
    const type = this.props.type;

    if(type === VIS_CHART_TYPE.HEATMAP_YEAR) {
      const [startMonth, endMonth] = this._getMonthInterval(aggs);
      const startFullDate = new Date(parseInt(year), startMonth - 1, 1);
      const endFullDate = new Date(parseInt(year), endMonth, 1);

      d3.select(svg)
        .selectAll('.day')
        .data(() => (
          d3.time.days(startFullDate, endFullDate)
        ))
        .enter().append('g').append('rect')
        .attr('id', (d) => {
          return 'day_' + moment(d).format(getTimeFormat());
        })
        .attr('class', 'day')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('x', (d) => {
          return (moment(d).month() - startMonth + 1) * 1.5 * cellSize +
            xOffset * 2 + ((d3.time.weekOfYear(d) - d3.time.weekOfYear(startFullDate)) * cellSize);
        })
        .attr('y', (d) => {
          return yOffset * 3 + (d.getDay() * cellSize);
        })
        .attr('rx', cellSize * 1 / 10)
        .attr('ry', cellSize * 1 / 10);
    }
  }

  async _drawBoundaries(svg, { year, aggs, cellSize, xOffset, yOffset }) {
    const type = this.props.type;

    if(type === VIS_CHART_TYPE.HEATMAP_YEAR) {
      const monthPath = (startFullDate) => {
        return function (t) {
          const t1 = new Date(t.getFullYear(), t.getMonth() + 1, 0);
          const d0 = t.getDay();
          const w0 = d3.time.weekOfYear(t) - d3.time.weekOfYear(startFullDate);
          const d1 = t1.getDay();
          const w1 = d3.time.weekOfYear(t1) - d3.time.weekOfYear(startFullDate);

          return 'M' + (w0 + 1) * cellSize + ',' + d0 * cellSize +
              'H' + w0 * cellSize + 'V' + 7 * cellSize +
              'H' + w1 * cellSize + 'V' + (d1 + 1) * cellSize +
              'H' + (w1 + 1) * cellSize + 'V' + 0 +
              'H' + (w0 + 1) * cellSize + 'Z';
        };
      };

      const [startMonth, endMonth] = this._getMonthInterval(aggs);
      const startFullDate = new Date(parseInt(year), startMonth - 1, 1);

      d3.select(svg).append('g')
        .attr('id', 'month-bound')
        .selectAll('.month')
        .data(() => {
          return d3.time.months(new Date(parseInt(year), startMonth - 1, 1),
            new Date(parseInt(year), endMonth, 1));
        })
        .enter().append('path')
        .attr('class', 'month')
        .attr('transform', (d) => (
          'translate(' + (moment(d).month() - startMonth + 1) * 1.5 * cellSize + (xOffset * 2) + ',' + (yOffset * 1.5) + ')'
        ))
        .attr('d', monthPath(startFullDate));
    }

  }

}
