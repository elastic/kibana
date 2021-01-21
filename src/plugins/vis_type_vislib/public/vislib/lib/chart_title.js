/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';
import _ from 'lodash';

import { ErrorHandler } from './_error_handler';
import { Tooltip } from '../components/tooltip';

export class ChartTitle extends ErrorHandler {
  constructor(visConfig) {
    super();
    this.el = visConfig.get('el');
    this.tooltip = new Tooltip('chart-title', this.el, function (d) {
      return '<p>' + _.escape(d.label) + '</p>';
    });
  }

  render() {
    const el = d3.select(this.el).select('.chart-title').node();
    const width = el ? el.clientWidth : 0;
    const height = el ? el.clientHeight : 0;

    return d3.select(this.el).selectAll('.chart-title').call(this.draw(width, height));
  }

  truncate(size) {
    const self = this;

    return function (selection) {
      selection.each(function () {
        const text = d3.select(this);
        const n = text[0].length;
        const maxWidth = (size / n) * 0.9;
        const length = this.getComputedTextLength();
        let str;
        let avg;
        let end;

        if (length > maxWidth) {
          str = text.text();
          avg = length / str.length;
          end = Math.floor(maxWidth / avg) - 5;
          str = str.substr(0, end) + '...';
          self.addMouseEvents(text);

          return text.text(str);
        }

        return text.text();
      });
    };
  }

  addMouseEvents(target) {
    if (this.tooltip) {
      return target.call(this.tooltip.render());
    }
  }

  draw(width, height) {
    const self = this;

    return function (selection) {
      selection.each(function () {
        const div = d3.select(this);
        const dataType = this.parentNode.__data__.rows ? 'rows' : 'columns';
        const size = dataType === 'rows' ? height : width;
        const txtHtOffset = 11;

        self.validateWidthandHeight(width, height);

        div
          .append('svg')
          .attr('focusable', 'false')
          .attr('width', width)
          .attr('height', height)
          .append('text')
          .attr('transform', function () {
            if (dataType === 'rows') {
              return 'translate(' + txtHtOffset + ',' + height / 2 + ')rotate(270)';
            }
            return 'translate(' + width / 2 + ',' + txtHtOffset + ')';
          })
          .attr('text-anchor', 'middle')
          .text(function (d) {
            return d.label;
          });

        // truncate long chart titles
        div.selectAll('text').call(self.truncate(size));
      });
    };
  }
}
