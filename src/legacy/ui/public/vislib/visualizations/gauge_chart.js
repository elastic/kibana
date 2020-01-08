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
import { Chart } from './_chart';
import { gaugeTypes } from './gauges/gauge_types';

export class GaugeChart extends Chart {
  constructor(handler, chartEl, chartData) {
    super(handler, chartEl, chartData);
    this.gaugeConfig = handler.visConfig.get('gauge', {});
    this.gauge = new gaugeTypes[this.gaugeConfig.type](this);
  }

  addEvents(element) {
    const events = this.events;

    return element.call(events.addHoverEvent()).call(events.addMouseoutEvent());
  }

  /**
   * returns the displayed width and height of a single gauge depending on selected alignment
   * @param alignment - automatic | horizontal | vertical
   * @param containerDom
   * @param nrOfItems
   * @returns {{width: number, height: number}}
   */
  calcGaugeDim(alignment, containerDom, nrOfItems) {
    const containerWidth = containerDom.clientWidth;
    const containerHeight = containerDom.clientHeight;
    const containerMargin = 25;

    //there are a few pixel of margin between multiple gauges
    //subtracting this margin prevents displaying scrollbars
    //this is because of the "chart-title" element,
    //that's inserted after the gauges
    const gaugeBottomMargin = Math.ceil(25 / nrOfItems);
    const availableWidth = containerWidth - containerMargin;
    const availableHeight = containerHeight - containerMargin;

    const adaptedWidth = Math.floor(availableWidth / nrOfItems);
    const adaptedHeight = Math.floor(availableHeight / nrOfItems) - gaugeBottomMargin;

    switch (alignment) {
      case 'vertical':
        return {
          width: containerWidth, //for compatiblity with tests
          height: adaptedHeight,
          alignment,
        };

      case 'horizontal':
        return {
          width: adaptedWidth,
          height: availableHeight,
          alignment,
        };

      default:
        return {
          width: availableWidth < availableHeight ? containerWidth : adaptedWidth,
          height: availableWidth < availableHeight ? adaptedHeight : availableHeight,
          alignment: availableWidth < availableHeight ? 'vertical' : 'horizontal',
        };
    }
  }

  draw() {
    const self = this;
    const { gaugeConfig } = this;

    return function(selection) {
      selection.each(function(data) {
        const div = d3.select(this);
        const { width, height } = self.calcGaugeDim(
          gaugeConfig.alignment,
          this,
          data.series.length
        );

        if (height < 0 || width < 0) return;

        div.style('text-align', 'center').style('overflow-y', 'auto');

        data.series.forEach(series => {
          const svg = div
            .append('svg')
            .style('display', 'inline-block')
            .style('overflow', 'hidden')
            .attr('focusable', 'false')
            .attr('width', width);

          const g = svg.append('g');
          const gauges = self.gauge.drawGauge(g, series, width, height);
          svg.attr('height', height);

          self.addEvents(gauges);
        });

        div
          .append('div')
          .attr('class', 'chart-title')
          .style('text-align', 'center')
          .text(data.label || data.yAxisLabel);

        self.events.emit('rendered', {
          chart: data,
        });

        return div;
      });
    };
  }
}
