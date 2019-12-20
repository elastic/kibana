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

import _ from 'lodash';
import moment from 'moment';

import { isColorDark } from '@elastic/eui';

import { PointSeries } from './_point_series';
import { getHeatmapColors } from '../../../legacy_imports';

const defaults = {
  color: undefined, // todo
  fillColor: undefined, // todo
};
/**
 * Line Chart Visualization
 *
 * @class HeatmapChart
 * @constructor
 * @extends Chart
 * @param handler {Object} Reference to the Handler Class Constructor
 * @param el {HTMLElement} HTML element to which the chart will be appended
 * @param chartData {Object} Elasticsearch query results for this specific chart
 */
export class HeatmapChart extends PointSeries {
  constructor(handler, chartEl, chartData, seriesConfigArgs) {
    super(handler, chartEl, chartData, seriesConfigArgs);
    this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);

    this.handler.visConfig.set('legend', {
      labels: this.getHeatmapLabels(this.handler.visConfig),
      colors: this.getHeatmapColors(this.handler.visConfig),
    });

    const colors = this.handler.visConfig.get('legend.colors', null);
    if (colors) {
      this.handler.vis.uiState.setSilent('vis.defaultColors', null);
      this.handler.vis.uiState.setSilent('vis.defaultColors', colors);
    }
  }

  getHeatmapLabels(cfg) {
    const percentageMode = cfg.get('percentageMode');
    const colorsNumber = cfg.get('colorsNumber');
    const colorsRange = cfg.get('colorsRange');
    const zAxisConfig = this.getValueAxis().axisConfig;
    const zAxisFormatter = zAxisConfig.get('labels.axisFormatter');
    const zScale = this.getValueAxis().getScale();
    const [min, max] = zScale.domain();
    const labels = [];
    const maxColorCnt = 10;
    if (cfg.get('setColorRange')) {
      colorsRange.forEach(range => {
        const from = isFinite(range.from) ? zAxisFormatter(range.from) : range.from;
        const to = isFinite(range.to) ? zAxisFormatter(range.to) : range.to;
        labels.push(`${from} - ${to}`);
      });
    } else {
      if (max === min) {
        return [min.toString()];
      }
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
          if (max - min > maxColorCnt) {
            const valInt = Math.ceil(val);
            if (i === 0) {
              val = valInt === val ? val : valInt - 1;
            } else {
              val = valInt;
            }
            nextVal = Math.ceil(nextVal);
          }
          if (isFinite(val)) val = zAxisFormatter(val);
          if (isFinite(nextVal)) nextVal = zAxisFormatter(nextVal);
          label = `${val} - ${nextVal}`;
        }

        labels.push(label);
      }
    }

    return labels;
  }

  getHeatmapColors(cfg) {
    const invertColors = cfg.get('invertColors');
    const colorSchema = cfg.get('colorSchema');
    const labels = this.getHeatmapLabels(cfg);
    const colors = {};
    for (const i in labels) {
      if (labels[i]) {
        const val = invertColors ? 1 - i / labels.length : i / labels.length;
        colors[labels[i]] = getHeatmapColors(val, colorSchema);
      }
    }
    return colors;
  }

  addSquares(svg, data) {
    const xScale = this.getCategoryAxis().getScale();
    const yScale = this.handler.categoryAxes[1].getScale();
    const zScale = this.getValueAxis().getScale();
    const tooltip = this.baseChart.tooltip;
    const isTooltip = this.handler.visConfig.get('tooltip.show');
    const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
    const colorsNumber = this.handler.visConfig.get('colorsNumber');
    const setColorRange = this.handler.visConfig.get('setColorRange');
    const colorsRange = this.handler.visConfig.get('colorsRange');
    const color = this.handler.data.getColorFunc();
    const labels = this.handler.visConfig.get('legend.labels');
    const zAxisConfig = this.getValueAxis().axisConfig;
    const zAxisFormatter = zAxisConfig.get('labels.axisFormatter');
    const showLabels = zAxisConfig.get('labels.show');
    const overwriteLabelColor = zAxisConfig.get('labels.overwriteColor', false);

    const layer = svg.append('g').attr('class', 'series');

    const squares = layer.selectAll('g.square').data(data.values);

    squares.exit().remove();

    let barWidth;
    if (this.getCategoryAxis().axisConfig.isTimeDomain()) {
      const { min, interval } = this.handler.data.get('ordered');
      const start = min;
      const end = moment(min)
        .add(interval)
        .valueOf();

      barWidth = xScale(end) - xScale(start);
      if (!isHorizontal) barWidth *= -1;
    }

    function x(d) {
      return xScale(d.x);
    }

    function y(d) {
      return yScale(d.series);
    }

    const [min, max] = zScale.domain();
    function getColorBucket(d) {
      let val = 0;
      if (setColorRange && colorsRange.length) {
        const bucket = _.find(colorsRange, range => {
          return range.from <= d.y && range.to > d.y;
        });
        return bucket ? colorsRange.indexOf(bucket) : -1;
      } else {
        if (isNaN(min) || isNaN(max)) {
          val = colorsNumber - 1;
        } else if (min === max) {
          val = 0;
        } else {
          val = (d.y - min) / (max - min); /* get val from 0 - 1 */
          val = Math.min(colorsNumber - 1, Math.floor(val * colorsNumber));
        }
      }
      if (d.y == null) {
        return -1;
      }
      return !isNaN(val) ? val : -1;
    }

    function label(d) {
      const colorBucket = getColorBucket(d);
      // colorBucket id should always GTE 0
      if (colorBucket < 0) d.hide = true;
      return labels[colorBucket];
    }

    function z(d) {
      if (label(d) === '') return 'transparent';
      return color(label(d));
    }

    const squareWidth = barWidth || xScale.rangeBand();
    const squareHeight = yScale.rangeBand();

    squares
      .enter()
      .append('g')
      .attr('class', 'square');

    squares
      .append('rect')
      .attr('x', x)
      .attr('width', squareWidth)
      .attr('y', y)
      .attr('height', squareHeight)
      .attr('data-label', label)
      .attr('fill', z)
      .attr('style', 'cursor: pointer; stroke: black; stroke-width: 0.1px')
      .style('display', d => {
        return d.hide ? 'none' : 'initial';
      });

    // todo: verify that longest label is not longer than the barwidth
    // or barwidth is not smaller than textheight (and vice versa)
    //
    if (showLabels) {
      const rotate = zAxisConfig.get('labels.rotate');
      const rotateRad = (rotate * Math.PI) / 180;
      const cellPadding = 5;
      const maxLength =
        Math.min(
          Math.abs(squareWidth / Math.cos(rotateRad)),
          Math.abs(squareHeight / Math.sin(rotateRad))
        ) - cellPadding;
      const maxHeight =
        Math.min(
          Math.abs(squareWidth / Math.sin(rotateRad)),
          Math.abs(squareHeight / Math.cos(rotateRad))
        ) - cellPadding;

      let labelColor;
      if (overwriteLabelColor) {
        // If overwriteLabelColor is true, use the manual specified color
        labelColor = zAxisConfig.get('labels.color');
      } else {
        // Otherwise provide a function that will calculate a light or dark color
        labelColor = d => {
          const bgColor = z(d);
          const color = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(bgColor);
          return color && isColorDark(parseInt(color[1]), parseInt(color[2]), parseInt(color[3]))
            ? '#FFF'
            : '#222';
        };
      }

      let hiddenLabels = false;
      squares
        .append('text')
        .text(d => zAxisFormatter(d.y))
        .style('display', function(d) {
          const textLength = this.getBBox().width;
          const textHeight = this.getBBox().height;
          const textTooLong = textLength > maxLength;
          const textTooWide = textHeight > maxHeight;
          if (!d.hide && (textTooLong || textTooWide)) {
            hiddenLabels = true;
          }
          return d.hide || textTooLong || textTooWide ? 'none' : 'initial';
        })
        .style('dominant-baseline', 'central')
        .style('text-anchor', 'middle')
        .style('fill', labelColor)
        .attr('x', function(d) {
          const center = x(d) + squareWidth / 2;
          return center;
        })
        .attr('y', function(d) {
          const center = y(d) + squareHeight / 2;
          return center;
        })
        .attr('transform', function(d) {
          const horizontalCenter = x(d) + squareWidth / 2;
          const verticalCenter = y(d) + squareHeight / 2;
          return `rotate(${rotate},${horizontalCenter},${verticalCenter})`;
        });
      if (hiddenLabels) {
        this.baseChart.handler.alerts.show('Some labels were hidden due to size constraints');
      }
    }

    if (isTooltip) {
      squares.call(tooltip.render());
    }

    return squares.selectAll('rect');
  }

  /**
   * Renders d3 visualization
   *
   * @method draw
   * @returns {Function} Creates the line chart
   */
  draw() {
    const self = this;

    return function(selection) {
      selection.each(function() {
        const svg = self.chartEl.append('g');
        svg.data([self.chartData]);

        const squares = self.addSquares(svg, self.chartData);
        self.addCircleEvents(squares);

        self.events.emit('rendered', {
          chart: self.chartData,
        });

        return svg;
      });
    };
  }
}
