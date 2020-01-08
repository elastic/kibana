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
import { Binder } from '../../../binder';
import { positionTooltip } from './position_tooltip';
import $ from 'jquery';
import theme from '@elastic/eui/dist/eui_theme_light.json';

let allContents = [];

const tooltipColumnPadding = parseInt(theme.euiSizeXS || 0, 10) * 2;
const tooltipTableMargin = parseInt(theme.euiSizeS || 0, 10) * 2;
const tooltipMaxWidth = parseInt(theme.euiSizeXL || 0, 10) * 10;

/**
 * Add tooltip and listeners to visualization elements
 *
 * @class Tooltip
 * @constructor
 * @param el {HTMLElement} Reference to DOM element
 * @param formatter {Function} Tooltip formatter
 * @param events {Constructor} Allows tooltip to return event response data
 */
export function Tooltip(id, el, formatter, events) {
  if (!(this instanceof Tooltip)) {
    return new Tooltip(id, el, formatter, events);
  }

  this.id = id; // unique id for this tooltip type
  this.el = el;
  this.order = 100; // higher ordered contents are rendered below the others
  this.formatter = formatter;
  this.events = events;
  this.containerClass = 'visWrapper';
  this.tooltipClass = 'visTooltip';
  this.tooltipSizerClass = 'visTooltip__sizingClone';
  this.showCondition = _.constant(true);

  this.binder = new Binder();
}

/**
 * Get jquery reference to the tooltip node
 *
 * @return {Object} jQuery node object
 */
Tooltip.prototype.$get = _.once(function() {
  return $('<div>')
    .addClass(this.tooltipClass)
    .appendTo(document.body);
});

/**
 * Get jquery reference to the tooltip sizer node
 *
 * @return {Object} jQuery node object
 */
Tooltip.prototype.$getSizer = _.once(function() {
  return this.$get()
    .clone()
    .removeClass(this.tooltipClass)
    .addClass(this.tooltipSizerClass)
    .appendTo(document.body);
});

/**
 * Show the tooltip, positioning it based on the content and chart container
 */
Tooltip.prototype.show = function() {
  const $tooltip = this.$get();
  const $chart = this.$getChart();
  const html = $tooltip.html();

  if (!$chart) return;

  const placement = positionTooltip(
    {
      $window: $(window),
      $chart: $chart,
      $el: $tooltip,
      $sizer: this.$getSizer(),
      event: d3.event,
    },
    html
  );

  $tooltip.css({
    visibility: 'visible',
    left: placement.left,
    top: placement.top,
  });
  // The number of columns on the tooltip is currently the only
  // thing that differenciate one tooltip; from another
  const tooltipColumns = $tooltip.find('tbody > tr:nth-of-type(1) > td').length;
  if (tooltipColumns === 2) {
    // on pointseries tooltip
    const tooltipWidth = $tooltip.outerWidth();
    // get the last column to the right
    const valueColumn = $tooltip.find('tr:nth-of-type(1) > td:nth-child(2)');
    if (valueColumn.length !== 1) {
      return;
    }
    const valueColumnSize = valueColumn.outerWidth();
    const isGratherThanHalf = valueColumnSize > tooltipWidth / 2;
    const containerMaxWidth = isGratherThanHalf
      ? tooltipWidth / 2 - tooltipTableMargin - tooltipColumnPadding * 2
      : tooltipWidth - valueColumnSize - tooltipTableMargin - tooltipColumnPadding;

    $tooltip.find('.visTooltip__labelContainer').css({
      'max-width': containerMaxWidth,
    });
    if (isGratherThanHalf && tooltipWidth === tooltipMaxWidth) {
      $tooltip.find('.visTooltip__valueContainer').css({
        'max-width': containerMaxWidth,
      });
    }
  } else if (tooltipColumns === 3) {
    // on hierarchical tooltip
    const tooltipWidth = $tooltip.outerWidth();
    // get the last column to the right (3rd column)
    const valueColumn = $tooltip.find('tr:nth-of-type(1) > td:nth-child(3)');
    if (valueColumn.length !== 1) {
      return;
    }
    const valueColumnSize = valueColumn.outerWidth();
    const containerMaxWidth =
      (tooltipWidth - valueColumnSize - tooltipTableMargin) / 2 - tooltipColumnPadding;

    $tooltip.find('.visTooltip__labelContainer').css({
      'max-width': containerMaxWidth,
    });
  }
};

/**
 * Hide the tooltip, clearing its contents
 */
Tooltip.prototype.hide = function() {
  const $tooltip = this.$get();
  allContents = [];
  $tooltip.css({
    visibility: 'hidden',
    left: '-500px',
    top: '-500px',
  });
};

/**
 * Get the jQuery chart node, based on the container object
 * NOTE: the container is a d3 selection
 *
 * @return {Object} jQuery node for the chart
 */
Tooltip.prototype.$getChart = function() {
  const chart = $(this.container && this.container.node());
  return chart.length ? chart : false;
};

/**
 * Renders tooltip
 *
 * @method render
 * @return {Function} Renders tooltip on a D3 selection
 */
Tooltip.prototype.render = function() {
  const self = this;

  /**
   * Calculates values for the tooltip placement
   *
   * @param {Object} selection D3 selection object
   */
  return function(selection) {
    const $tooltip = self.$get();
    const id = self.id;
    const order = self.order;

    if (
      self.container === undefined ||
      self.container !== d3.select(self.el).select('.' + self.containerClass)
    ) {
      self.container = d3.select(self.el).select('.' + self.containerClass);
    }

    const $chart = self.$getChart();
    if ($chart) {
      self.binder.jqOn($chart, 'mouseleave', function() {
        // only clear when we leave the chart, so that
        // moving between points doesn't make it reposition
        $chart.removeData('previousPlacement');
      });
    }

    selection.each(function(d, i) {
      const element = d3.select(this);

      function render(html) {
        allContents = _.filter(allContents, function(content) {
          return content.id !== id;
        });

        if (html) allContents.push({ id: id, html: html, order: order });

        const allHtml = _(allContents)
          .sortBy('order')
          .pluck('html')
          .compact()
          .join('\n');

        if (allHtml) {
          $tooltip.html(allHtml);
          self.show();
        } else {
          self.hide();
        }
      }

      self.binder.fakeD3Bind(this, 'mousemove', function() {
        if (!self.showCondition.call(element, d, i)) {
          return render();
        }

        const events = self.events ? self.events.eventResponse(d, i) : d;
        return render(self.formatter(events));
      });

      self.binder.fakeD3Bind(this, 'mouseleave', function() {
        render();
      });
    });
  };
};

Tooltip.prototype.destroy = function() {
  this.hide();
  this.binder.destroy();
};

export function TooltipProvider() {
  return Tooltip;
}
