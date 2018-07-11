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
import { AxisConfig } from './axis_config';
import { AXIS_SCALE_TYPE, CalendarAxisScale, getNumericMonth } from './axis_scale';

export class CalendarAxis extends React.Component {
  constructor(props) {
    super(props);
    const { gridConfig, axisConfig, type } = this.props;
    this.axisConfig = new AxisConfig(axisConfig, gridConfig);
    this.axisConfig.validateAxis(type);
    this.axisScale = new CalendarAxisScale(this.axisConfig);
    this.axis = React.createRef();
  }

  componentDidMount() {
    const pos = this.axisConfig.get('position');
    const { vislibData } = this.props;
    if (pos === 'top') {
      this._drawTop(vislibData);
    } else if (pos === 'left') {
      this._drawLeft(vislibData);
    }
  }

  render() {
    const type = this.axisConfig.get('scale.type');
    let axisId;
    if(type === AXIS_SCALE_TYPE.MONTHS) {
      axisId = 'month-labels';
    }else if(type === AXIS_SCALE_TYPE.WEEKS) {
      axisId = 'day-labels';
    }
    return (
      <svg id={axisId} ref={this.axis} />
    );
  }

  componentWillUnmount() {
    this.axisConfig = null;
    this.axisScale = null;
    this.axis = null;
  }

  _drawTop(vislibData) {
    const [
      type,
      cellSize,
      xOffset,
      yOffset,
      padding
    ] = this.axisConfig.get(['scale.type', 'cellSize', 'xOffset', 'yOffset', 'padding']);

    if (type === AXIS_SCALE_TYPE.MONTHS) {
      const label = vislibData.label;
      const year = label.slice(0, 4);
      const monthLabels = d3.select(this.axis.current);

      const monthLeftPad = [];
      const [startMonth, endMonth] = this.axisScale.getExtents(vislibData);
      const sMonth = getNumericMonth(startMonth, year);
      const eMonth = getNumericMonth(endMonth, year);

      const valArray = this.axisScale.values.filter((val, i) => i >= sMonth - 1 && i <= eMonth - 1);
      for(let i = sMonth; i <= eMonth; ++i) {
        const pad = cellSize * (
          (i - sMonth) * 1.5 +
          (d3.time.weekOfYear(new Date(year, i - 1, 1)) - d3.time.weekOfYear(new Date(year, sMonth - 1, 1)))
        );
        monthLeftPad.push(pad);
      }
      valArray.forEach((d, i) => {
        monthLabels.append('text')
          .attr('class', 'month-label')
          .attr('x', monthLeftPad[i] + padding + xOffset * 2)
          .attr('y', yOffset * 2.5)
          .style('font-size', cellSize * 4 / 5)
          .text(d);
      });
    }
  }

  _drawLeft() {
    const [type, cellSize, padding, yOffset] = this.axisConfig.get(['scale.type', 'cellSize', 'padding', 'yOffset']);

    if(type === AXIS_SCALE_TYPE.WEEKS) {
      const dayLabels = d3.select(this.axis.current);

      this.axisScale.values.forEach(function (d, i) {
        dayLabels.append('text')
          .attr('class', 'day-label')
          .attr('y', () => (yOffset * 3.1) + ((i + 0.4) * padding))
          .attr('x', 5)
          .style('font-size', cellSize * 4 / 5)
          .text(d);
      });
    }
  }

}
