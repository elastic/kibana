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

import d3 from 'd3';
import dateMath from '@elastic/datemath';

export class TimeMarker {
  constructor(times, xScale, height) {
    const currentTimeArr = [
      {
        time: new Date().getTime(),
        class: 'time-marker',
        color: '#c80000',
        opacity: 0.3,
        width: 2,
      },
    ];

    this.xScale = xScale;
    this.height = height;
    this.times = times.length
      ? times.map(function(d) {
          return {
            time: dateMath.parse(d.time),
            class: d.class || 'time-marker',
            color: d.color || '#c80000',
            opacity: d.opacity || 0.3,
            width: d.width || 2,
          };
        })
      : currentTimeArr;
  }

  _isTimeBasedChart(selection) {
    const data = selection.data();
    return data.every(function(datum) {
      return datum.ordered && datum.ordered.date;
    });
  }

  render(selection) {
    const self = this;

    // return if not time based chart
    if (!self._isTimeBasedChart(selection)) return;

    selection.each(function() {
      d3.select(this)
        .selectAll('time-marker')
        .data(self.times)
        .enter()
        .append('line')
        .attr('class', function(d) {
          return d.class;
        })
        .attr('pointer-events', 'none')
        .attr('stroke', function(d) {
          return d.color;
        })
        .attr('stroke-width', function(d) {
          return d.width;
        })
        .attr('stroke-opacity', function(d) {
          return d.opacity;
        })
        .attr('x1', function(d) {
          return self.xScale(d.time);
        })
        .attr('x2', function(d) {
          return self.xScale(d.time);
        })
        .attr('y1', self.height)
        .attr('y2', self.xScale.range()[0]);
    });
  }
}
