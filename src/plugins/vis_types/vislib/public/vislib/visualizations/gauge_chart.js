/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import d3 from 'd3';
import { Chart } from './_chart';
import { gaugeTypes } from './gauges/gauge_types';

export class GaugeChart extends Chart {
  constructor(handler, chartEl, chartData, uiSettings) {
    super(handler, chartEl, chartData, uiSettings);
    this.gaugeConfig = handler.visConfig.get('gauge', {});
    this.gauge = new gaugeTypes[this.gaugeConfig.type](this, uiSettings);
  }

  addEvents(element) {
    const events = this.events;

    return element
      .call(events.addHoverEvent())
      .call(events.addMouseoutEvent())
      .call(events.addClickEvent());
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

    return function (selection) {
      selection.each(function (data) {
        const div = d3.select(this);
        const { width, height } = self.calcGaugeDim(
          gaugeConfig.alignment,
          this,
          data.series.length
        );

        if (height < 0 || width < 0) return;

        div.style('text-align', 'center').style('overflow-y', 'auto');

        data.series.forEach((series) => {
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
