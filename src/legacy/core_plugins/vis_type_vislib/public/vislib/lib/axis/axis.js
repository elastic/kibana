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
import { ErrorHandler } from '../_error_handler';
import { AxisTitle } from './axis_title';
import { AxisLabels } from './axis_labels';
import { AxisScale } from './axis_scale';
import { AxisConfig } from './axis_config';
import { VislibError } from '../../errors';

export class Axis extends ErrorHandler {
  constructor(visConfig, axisConfigArgs) {
    super();
    this.visConfig = visConfig;

    this.axisConfig = new AxisConfig(this.visConfig, axisConfigArgs);
    if (this.axisConfig.get('type') === 'category') {
      this.values = this.axisConfig.values;
      this.ordered = this.axisConfig.ordered;
    }
    this.axisScale = new AxisScale(this.axisConfig, visConfig);
    this.axisTitle = new AxisTitle(this.axisConfig);
    this.axisLabels = new AxisLabels(this.axisConfig, this.axisScale);

    this.stack = d3.layout
      .stack()
      .x(d => {
        return d.x;
      })
      .y(d => {
        if (
          typeof this.axisConfig.get('scale.offset') === 'function' &&
          this.axisConfig.get('scale.offset').name === 'expand'
        ) {
          return Math.abs(d.y);
        }
        return d.y;
      })
      .offset(this.axisConfig.get('scale.offset', 'zero'));

    const stackedMode = ['normal', 'grouped'].includes(this.axisConfig.get('scale.mode'));
    if (stackedMode) {
      this.stack = this._stackNegAndPosVals;
    }
  }

  _stackNegAndPosVals(data) {
    const cache = {};
    data.forEach(series => {
      series.forEach(value => {
        if (!cache[value.x]) cache[value.x] = [0, 0];
        value.y0 = cache[value.x][value.y < 0 ? 0 : 1];
        cache[value.x][value.y < 0 ? 0 : 1] += value.y;
      });
    });
    return data;
  }

  render() {
    const elSelector = this.axisConfig.get('elSelector');
    const rootEl = this.axisConfig.get('rootEl');
    d3.select(rootEl)
      .selectAll(elSelector)
      .call(this.draw());
  }

  destroy() {
    const elSelector = this.axisConfig.get('elSelector');
    const rootEl = this.axisConfig.get('rootEl');
    $(rootEl)
      .find(elSelector)
      .find('svg')
      .remove();
    this.axisTitle.destroy();
  }

  getAxis(length) {
    const scale = this.axisScale.getScale(length);
    const position = this.axisConfig.get('position');
    const axisFormatter = this.axisConfig.get('labels.axisFormatter');

    const d3Axis = d3.svg
      .axis()
      .scale(scale)
      .tickFormat(axisFormatter)
      .orient(position);

    if (this.axisConfig.isTimeDomain()) {
      // use custom overwritten tick function on time domains to get nice
      // tick positions (e.g. at the start of the day) even for custom timezones
      d3Axis.tickValues(scale.timezoneCorrectedTicks(this.tickScale(length)));
    } else {
      d3Axis.ticks(this.tickScale(length));
    }

    return d3Axis;
  }

  getScale() {
    return this.axisScale.scale;
  }

  addInterval(interval) {
    return this.axisScale.addInterval(interval);
  }

  substractInterval(interval) {
    return this.axisScale.substractInterval(interval);
  }

  tickScale(length) {
    const yTickScale = d3.scale
      .linear()
      .clamp(true)
      .domain([20, 40, 1000])
      .range([0, 3, 11]);

    return Math.ceil(yTickScale(length));
  }

  getLength(el) {
    if (this.axisConfig.isHorizontal()) {
      return $(el).width();
    } else {
      return $(el).height();
    }
  }

  adjustSize() {
    const config = this.axisConfig;
    const style = config.get('style');
    const chartEl = this.visConfig.get('el');
    const position = config.get('position');
    const axisPadding = 5;

    return function(selection) {
      const text = selection.selectAll('.tick text');
      const lengths = [];

      text.each(function textWidths() {
        lengths.push(
          (() => {
            if (config.isHorizontal()) {
              return d3
                .select(this.parentNode)
                .node()
                .getBBox().height;
            } else {
              return d3
                .select(this.parentNode)
                .node()
                .getBBox().width;
            }
          })()
        );
      });
      let length = lengths.length > 0 ? _.max(lengths) : 0;
      length += axisPadding;

      if (config.isHorizontal()) {
        selection.attr('height', Math.ceil(length));
        if (position === 'top') {
          selection
            .select('g')
            .attr('transform', `translate(0, ${length - parseInt(style.lineWidth)})`);
          selection.select('path').attr('transform', 'translate(1,0)');
        }
        if (config.get('type') === 'value') {
          const spacerNodes = $(chartEl).find(`.visAxis__spacer--y-${position}`);
          const elHeight = $(chartEl)
            .find(`.visAxis__column--${position}`)
            .height();
          spacerNodes.height(elHeight);
        }
      } else {
        const axisWidth = Math.ceil(length);
        selection.attr('width', axisWidth);
        if (position === 'left') {
          selection.select('g').attr('transform', `translate(${axisWidth},0)`);
        }
      }
    };
  }

  validate() {
    if (this.axisConfig.isLogScale() && this.axisConfig.isPercentage()) {
      throw new VislibError(`Can't mix percentage mode with log scale.`);
    }
  }

  draw() {
    const svgs = [];
    const self = this;
    const config = this.axisConfig;
    const style = config.get('style');

    return function(selection) {
      const n = selection[0].length;
      if (
        config.get('show') &&
        self.axisTitle &&
        ['left', 'top'].includes(config.get('position'))
      ) {
        self.axisTitle.render(selection);
      }
      selection.each(function() {
        const el = this;
        const div = d3.select(el);
        const width = $(el).width();
        const height = $(el).height();
        const length = self.getLength(el, n);

        self.validate();

        const axis = self.getAxis(length);

        if (config.get('show')) {
          const svg = div
            .append('svg')
            .attr('focusable', 'false')
            .attr('width', width)
            .attr('height', height);

          svgs.push(svg);

          const axisClass = self.axisConfig.isHorizontal() ? 'x' : 'y';
          svg
            .append('g')
            .attr('class', `${axisClass} axis ${config.get('id')}`)
            .call(axis);

          const container = svg.select('g.axis').node();
          if (container) {
            svg
              .select('path')
              .style('stroke', style.color)
              .style('stroke-width', style.lineWidth)
              .style('stroke-opacity', style.opacity);
            svg
              .selectAll('line')
              .style('stroke', style.tickColor)
              .style('stroke-width', style.tickWidth)
              .style('stroke-opacity', style.opacity);
          }
          if (self.axisLabels) self.axisLabels.render(svg);
        }
      });

      if (self.axisTitle && ['right', 'bottom'].includes(config.get('position'))) {
        self.axisTitle.render(selection);
      }

      svgs.forEach(svg => svg.call(self.adjustSize()));
    };
  }
}
