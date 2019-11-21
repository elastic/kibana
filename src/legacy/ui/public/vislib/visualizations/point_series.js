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
import _ from 'lodash';
import $ from 'jquery';
import { Tooltip } from '../../vis/components/tooltip';
import { Chart } from './_chart';
import { TimeMarker } from './time_marker';
import { seriesTypes } from './point_series/series_types';
import touchdownTmplHtml from '../partials/touchdown.tmpl.html';

const seriTypes = seriesTypes;
const touchdownTmpl = _.template(touchdownTmplHtml);
/**
 * Line Chart Visualization
 *
 * @class PointSeries
 * @constructor
 * @extends Chart
 * @param handler {Object} Reference to the Handler Class Constructor
 * @param el {HTMLElement} HTML element to which the chart will be appended
 * @param chartData {Object} Elasticsearch query results for this specific chart
 */
export class PointSeries extends Chart {
  constructor(handler, chartEl, chartData) {
    super(handler, chartEl, chartData);

    this.handler = handler;
    this.chartData = chartData;
    this.chartEl = chartEl;
    this.chartConfig = this.findChartConfig();
    this.handler.pointSeries = this;
  }

  findChartConfig() {
    const charts = this.handler.visConfig.get('charts');
    const chartIndex = this.handler.data.chartData().indexOf(this.chartData);
    return charts[chartIndex];
  }

  getSeries(seriesId) {
    return this.series.find(series => series.chartData.aggId === seriesId);
  }

  addBackground(svg, width, height) {
    const startX = 0;
    const startY = 0;

    return svg
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .attr('class', 'background');
  }

  addGrid(svg) {
    const { width, height } = svg.node().getBBox();
    return svg
      .append('g')
      .attr('class', 'grid')
      .call(this.handler.grid.draw(width, height));
  }

  addClipPath(svg) {
    const { width, height } = svg.node().getBBox();
    const startX = 0;
    const startY = 0;
    this.clipPathId = 'chart-area' + _.uniqueId();

    // Creating clipPath
    return svg
      .append('clipPath')
      .attr('id', this.clipPathId)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height);
  }

  addEvents(svg) {
    const isBrushable = this.events.isBrushable();
    if (isBrushable) {
      this.events.addBrushEvent(svg);
    }
  }

  createEndZones(svg) {
    const self = this;
    const xAxis = this.handler.categoryAxes[0];
    const xScale = xAxis.getScale();
    const ordered = xAxis.ordered;
    const isHorizontal = xAxis.axisConfig.isHorizontal();
    const missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

    if (missingMinMax || ordered.endzones === false) return;

    const { width, height } = svg.node().getBBox();

    // we don't want to draw endzones over our min and max values, they
    // are still a part of the dataset. We want to start the endzones just
    // outside of them so we will use these values rather than ordered.min/max
    const oneUnit = (ordered.units || _.identity)(1);

    const drawInverted = isHorizontal || xAxis.axisConfig.get('scale.inverted', false);
    const size = isHorizontal ? width : height;
    // points on this axis represent the amount of time they cover,
    // so draw the endzones at the actual time bounds
    const leftEndzone = {
      x: drawInverted ? 0 : Math.max(xScale(ordered.min), 0),
      w: drawInverted ? Math.max(xScale(ordered.min), 0) : height - Math.max(xScale(ordered.min), 0)
    };

    const expandLastBucket = xAxis.axisConfig.get('scale.expandLastBucket');
    const rightLastVal = expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.values));
    const rightStart = rightLastVal + oneUnit;
    const rightEndzone = {
      x: drawInverted ? xScale(rightStart) : 0,
      w: drawInverted ? Math.max(size - xScale(rightStart), 0) : xScale(rightStart)
    };

    this.endzones = svg.selectAll('.layer')
      .data([leftEndzone, rightEndzone])
      .enter()
      .insert('g', '.brush')
      .attr('class', 'endzone')
      .append('rect')
      .attr('class', 'zone')
      .attr('x', function (d) {
        return isHorizontal ? d.x : 0;
      })
      .attr('y', function (d) {
        return isHorizontal ? 0 : d.x;
      })
      .attr('height', function (d) {
        return isHorizontal ? height : d.w;
      })
      .attr('width', function (d) {
        return isHorizontal ? d.w : width;
      });

    function callPlay(event) {
      const boundData = event.target.__data__;
      const mouseChartXCoord = event.clientX - self.chartEl.getBoundingClientRect().left;
      const mouseChartYCoord = event.clientY - self.chartEl.getBoundingClientRect().top;
      const wholeBucket = boundData && boundData.x != null;

      // the min and max that the endzones start in
      const min = drawInverted ? leftEndzone.w : rightEndzone.w;
      const max = drawInverted ? rightEndzone.x : leftEndzone.x;

      // bounds of the cursor to consider
      let xLeft = isHorizontal ? mouseChartXCoord : mouseChartYCoord;
      let xRight = isHorizontal ? mouseChartXCoord : mouseChartYCoord;
      if (wholeBucket) {
        xLeft = xScale(boundData.x);
        xRight = xScale(xAxis.addInterval(boundData.x));
      }

      return {
        wholeBucket: wholeBucket,
        touchdown: min > xLeft || max < xRight
      };
    }

    function textFormatter() {
      return touchdownTmpl(callPlay(d3.event));
    }

    const endzoneTT = new Tooltip('endzones', this.handler.el, textFormatter, null);
    this.tooltips.push(endzoneTT);
    endzoneTT.order = 0;
    endzoneTT.showCondition = function inEndzone() {
      return callPlay(d3.event).touchdown;
    };
    endzoneTT.render()(svg);
  }

  calculateRadiusLimits(data) {
    this.radii = _(data.series)
      .map(function (series) {
        return _.map(series.values, 'z');
      })
      .flattenDeep()
      .reduce(function (result, val) {
        if (result.min > val) result.min = val;
        if (result.max < val) result.max = val;
        return result;
      }, {
        min: Infinity,
        max: -Infinity
      });
  }

  draw() {
    const self = this;
    const $elem = $(this.chartEl);
    const width = this.chartConfig.width = $elem.width();
    const height = this.chartConfig.height = $elem.height();
    const xScale = this.handler.categoryAxes[0].getScale();
    const addTimeMarker = this.chartConfig.addTimeMarker;
    const times = this.chartConfig.times || [];
    let div;
    let svg;

    return function (selection) {
      selection.each(function (data) {
        const el = this;

        div = d3.select(el);

        svg = div.append('svg')
          .attr('focusable', 'false')
          .attr('width', width)
          .attr('height', height);

        self.addBackground(svg, width, height);
        self.addGrid(svg);
        self.addClipPath(svg);
        self.addEvents(svg);
        self.createEndZones(svg);
        self.calculateRadiusLimits(data);

        self.series = [];
        _.each(self.chartConfig.series, (seriArgs, i) => {
          if (!seriArgs.show) return;
          const SeriClass = seriTypes[seriArgs.type || self.handler.visConfig.get('chart.type')] || seriTypes.line;
          const series = new SeriClass(self.handler, svg, data.series[i], seriArgs);
          series.events = self.events;
          svg.call(series.draw());
          self.series.push(series);
        });

        if (addTimeMarker) {
          //Domain end of 'now' will be milliseconds behind current time
          //Extend toTime by 1 minute to ensure those cases have a TimeMarker
          const toTime = new Date(xScale.domain()[1].getTime() + 60000);
          const currentTime = new Date();
          if (toTime > currentTime) {
            new TimeMarker(times, xScale, height).render(svg);
          }
        }

        return svg;
      });
    };
  }
}
