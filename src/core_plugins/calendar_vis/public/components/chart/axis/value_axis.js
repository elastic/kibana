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
import moment from 'moment';
import { AxisConfig } from './axis_config';
import { CalendarAxisScale } from './axis_scale';
import { getTimeFormat, getHeatmapColors } from '../../../utils';

export class ValueAxis {
  constructor(visConfig, axisConfig, vis) {
    this.visConfig = visConfig;
    this.axisConfig = new AxisConfig(axisConfig, this.visConfig.get('grid'));
    this.axisConfig.validateAxis(this.visConfig.get('type'));
    this.vis = vis;
    this.axisScale = new CalendarAxisScale(this.axisConfig);
  }

  _getHeatmapLabels(domain) {
    const percentageMode = this.visConfig.get('percentageMode');
    const colorsNumber = this.visConfig.get('colorsNumber');
    const labels = [];
    const scale = d3.scale.linear().domain(domain);
    const [min, max] = scale.domain();
    for (let i = 0; i < colorsNumber; i++) {
      let label;
      let val = i / colorsNumber;
      let nextVal = (i + 1) / colorsNumber;
      if (percentageMode) {
        val = Math.ceil(val * 100);
        nextVal = Math.ceil(nextVal * 100);
        label = `${val}% - ${nextVal}%`;
      } else {
        val = val * (max - min) + min;
        nextVal = nextVal * (max - min) + min;
        if (max > 1) {
          val = Math.ceil(val);
          nextVal = Math.ceil(nextVal);
        }
        label = `${val} - ${nextVal}`;
      }

      labels.push(label);
    }

    return labels;
  }

  _getHeatmapColors() {
    const colorsNumber = this.visConfig.get('colorsNumber');
    const invertColors = this.visConfig.get('invertColors');
    const colorSchema = this.visConfig.get('colorSchema');
    const labels = this.visConfig.get('legend.labels');
    const colors = {};
    for (const i in labels) {
      if (labels[i]) {
        const val = invertColors ? 1 - i / colorsNumber : i / colorsNumber;
        colors[labels[i]] = getHeatmapColors(val, colorSchema);
      }
    }
    return colors;
  }

  drawValues(vislibData) {
    const rows = vislibData.getData();
    const yearlyData = rows.map(r => r.series[0].values);
    const colorsNumber = this.visConfig.get('colorsNumber');
    const domain = this.axisScale.getExtents(vislibData);
    const labels = this._getHeatmapLabels(domain);
    this.visConfig.set('legend', {
      labels: labels
    });

    const colors = this._getHeatmapColors();
    this.vis.getUiState().setSilent('vis.defaultColors', null);
    this.vis.getUiState().setSilent('vis.defaultColors', colors);

    const color = vislibData.getColorFunc();
    const [min, max] = domain;

    function getColorBucket(d) {
      let val = 0;
      if (isNaN(min) || isNaN(max)) {
        val = colorsNumber - 1;
      } else if (min === max) {
        val = 0;
      } else {
        val = (d.y - min) / (max - min); /* get val from 0 - 1 */
        val = Math.min(colorsNumber - 1, Math.floor(val * colorsNumber));
      }
      return !isNaN(val) ? val : -1;
    }

    function label(d) {
      const colorBucket = getColorBucket(d);
      if (colorBucket === -1) d.hide = true;
      return labels[colorBucket];
    }

    function z(d) {
      if (label(d) === void 0) return 'transparent';
      return color(label(d));
    }

    yearlyData.forEach(yrData => {
      yrData.forEach(v => {
        const id = '#day_' + moment(v.x).format(getTimeFormat());
        d3.select(id)
          .attr('class', 'data-day')
          .attr('data-label', label(v))
          .style('fill', z(v));
      });
    });

  }


}
