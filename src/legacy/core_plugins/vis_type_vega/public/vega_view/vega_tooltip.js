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

import { calculatePopoverPosition } from '@elastic/eui';
import { formatValue as createTooltipContent } from 'vega-tooltip';
import _ from 'lodash';

// Some of this code was adapted from https://github.com/vega/vega-tooltip

const tooltipId = 'vega-kibana-tooltip';

/**
 * Simulate the result of the DOM's getBoundingClientRect()
 */
function createRect(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
  };
}

/**
 * The tooltip handler class.
 */
export class TooltipHandler {
  constructor(container, view, opts) {
    this.container = container;
    this.position = opts.position;
    this.padding = opts.padding;
    this.centerOnMark = opts.centerOnMark;

    view.tooltip(this.handler.bind(this));
  }

  /**
   * The handler function.
   */
  handler(view, event, item, value) {
    this.hideTooltip();

    // hide tooltip for null, undefined, or empty string values
    if (value == null || value === '') {
      return;
    }

    const el = document.createElement('div');
    el.setAttribute('id', tooltipId);
    ['vgaVis__tooltip', 'euiToolTipPopover', 'euiToolTip', `euiToolTip--${this.position}`].forEach(
      className => {
        el.classList.add(className);
      }
    );

    // Sanitized HTML is created by the tooltip library,
    // with a large number of tests, hence suppressing eslint here.
    // eslint-disable-next-line no-unsanitized/property
    el.innerHTML = createTooltipContent(value, _.escape, 2);

    // add to DOM to calculate tooltip size
    document.body.appendChild(el);

    // if centerOnMark numeric value is smaller than the size of the mark, use mouse [x,y]
    let anchorBounds;
    if (item.bounds.width() > this.centerOnMark || item.bounds.height() > this.centerOnMark) {
      // I would expect clientX/Y, but that shows incorrectly
      anchorBounds = createRect(event.pageX, event.pageY, 0, 0);
    } else {
      const containerBox = this.container.getBoundingClientRect();
      anchorBounds = createRect(
        containerBox.left + view._origin[0] + item.bounds.x1 + window.pageXOffset,
        containerBox.top + view._origin[1] + item.bounds.y1 + window.pageYOffset,
        item.bounds.width(),
        item.bounds.height()
      );
    }

    const pos = calculatePopoverPosition(
      anchorBounds,
      el.getBoundingClientRect(),
      this.position,
      this.padding
    );

    el.setAttribute('style', `top: ${pos.top}px; left: ${pos.left}px`);
  }

  hideTooltip() {
    const el = document.getElementById(tooltipId);
    if (el) el.remove();
  }
}
