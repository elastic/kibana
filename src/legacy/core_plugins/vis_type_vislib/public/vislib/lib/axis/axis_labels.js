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
import $ from 'jquery';
import { truncateLabel } from '../../components/labels/truncate_labels';

export class AxisLabels {
  constructor(axisConfig, scale) {
    this.axisConfig = axisConfig;
    this.axisScale = scale;
  }

  render(selection) {
    selection.call(this.draw());
  }

  rotateAxisLabels() {
    const config = this.axisConfig;
    return function(selection) {
      const text = selection.selectAll('.tick text');

      if (config.get('labels.rotate')) {
        text
          .style('text-anchor', function() {
            const currentValue = $(this).css('text-anchor');
            const rotateDeg = config.get('labels.rotate');
            if (!rotateDeg) return currentValue;
            else {
              const position = config.get('position');
              switch (position) {
                case 'top':
                  return 'end';
                case 'bottom':
                  return 'end';
                default:
                  if (rotateDeg === 90 || rotateDeg === -90) return 'middle';
                  return currentValue;
              }
            }
          })
          .attr('dy', function() {
            return config.isHorizontal() ? '0.3em' : '0';
          })
          .attr('transform', function rotate(d, j) {
            const position = config.get('position');
            const rotateDeg =
              position === 'top' ? config.get('labels.rotate') : -config.get('labels.rotate');

            if ($(this).css('text-anchor') === 'middle') {
              const coord = text[0][j].getBBox();
              const transX = coord.x + coord.width / 2;
              const transY = coord.y + coord.height / 2;
              return `rotate(${rotateDeg}, ${transX}, ${transY})`;
            } else {
              const transX = this.attributes.x.nodeValue;
              const transY = this.attributes.y.nodeValue;
              return `rotate(${rotateDeg}, ${transX}, ${transY})`;
            }
          });
      }
    };
  }

  truncateLabels() {
    const config = this.axisConfig;
    return function(selection) {
      if (!config.get('labels.truncate')) return;

      selection.selectAll('.tick text').text(function() {
        return truncateLabel(this, config.get('labels.truncate'));
      });
    };
  }

  filterAxisLabels() {
    const self = this;
    const config = this.axisConfig;
    const padding = 1.1;
    let lastTickStartEdge = Number.POSITIVE_INFINITY;
    let lastTickEndEdge = Number.NEGATIVE_INFINITY;

    return function(selection) {
      if (!config.get('labels.filter')) return;

      const el = $(config.get('rootEl')).find(config.get('elSelector'));
      const upperBound = config.isHorizontal() ? el.width() : el.height();
      const lowerBound = 0;
      const scaleRange = self.axisScale.scale.range();
      const scaleWidth = Math.abs(scaleRange[scaleRange.length - 1] - scaleRange[0]);
      const scaleStartPad = 0.5 * (upperBound - scaleWidth);

      selection.selectAll('.tick text').text(function(d) {
        const parentNode = d3.select(this.parentNode).node();
        const currentTickCenter =
          scaleStartPad +
          (config.isHorizontal() ? self.axisScale.scale(d) : upperBound - self.axisScale.scale(d));
        const currentTickSize =
          (config.isHorizontal() ? parentNode.getBBox().width : parentNode.getBBox().height) *
          padding;
        const currentTickHalfSize = currentTickSize / 2;
        const currentTickStartEdge = currentTickCenter - currentTickHalfSize;
        const currentTickEndEdge = currentTickCenter + currentTickHalfSize;

        const outsideUpperBound = currentTickEndEdge > upperBound;
        const outsideLowerBound = currentTickStartEdge < lowerBound;
        const overlapsLastTick =
          currentTickEndEdge >= lastTickStartEdge && currentTickStartEdge <= lastTickEndEdge;

        if (outsideUpperBound || outsideLowerBound || overlapsLastTick) {
          d3.select(this.parentNode).remove();
        } else {
          lastTickStartEdge = currentTickCenter - currentTickHalfSize;
          lastTickEndEdge = currentTickCenter + currentTickHalfSize;
          return this.textContent;
        }
      });
    };
  }

  draw() {
    const self = this;
    const config = this.axisConfig;

    return function(selection) {
      selection.each(function() {
        selection.selectAll('text').attr('style', function() {
          const currentStyle = d3.select(this).attr('style');
          return `${currentStyle} font-size: ${config.get('labels.fontSize')};`;
        });
        if (!config.get('labels.show')) selection.selectAll('text').attr('style', 'display: none;');

        selection.call(self.truncateLabels());
        selection.call(self.rotateAxisLabels());
        selection.call(self.filterAxisLabels());
      });
    };
  }
}
