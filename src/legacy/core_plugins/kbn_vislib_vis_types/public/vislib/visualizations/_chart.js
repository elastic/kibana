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
import { dataLabel } from '../lib/_data_label';
import { Dispatch } from '../lib/dispatch';
import { Tooltip } from '../../../../../ui/public/vis/components/tooltip';
import { getFormat } from '../../../../../ui/public/visualize/loader/pipeline_helpers/utilities';
import { getHierarchicalTooltipFormatter } from '../../../../../ui/public/vis/components/tooltip/_hierarchical_tooltip_formatter';
import { getPointSeriesTooltipFormatter } from '../../../../../ui/public/vis/components/tooltip/_pointseries_tooltip_formatter';

/**
 * The Base Class for all visualizations.
 *
 * @class Chart
 * @constructor
 * @param handler {Object} Reference to the Handler Class Constructor
 * @param el {HTMLElement} HTML element to which the chart will be appended
 * @param chartData {Object} Elasticsearch query results for this specific chart
 */
export class Chart {
  constructor(handler, el, chartData) {
    this.handler = handler;
    this.chartEl = el;
    this.chartData = chartData;
    this.tooltips = [];

    const events = (this.events = new Dispatch(handler));

    const fieldFormatter = getFormat(this.handler.data.get('tooltipFormatter'));
    const tooltipFormatterProvider =
      this.handler.visConfig.get('type') === 'pie'
        ? getHierarchicalTooltipFormatter()
        : getPointSeriesTooltipFormatter();
    const tooltipFormatter = tooltipFormatterProvider(fieldFormatter);

    if (this.handler.visConfig && this.handler.visConfig.get('addTooltip', false)) {
      const $el = this.handler.el;

      // Add tooltip
      this.tooltip = new Tooltip('chart', $el, tooltipFormatter, events);
      this.tooltips.push(this.tooltip);
    }

    this._addIdentifier = _.bind(this._addIdentifier, this);
  }

  /**
   * Renders the chart(s)
   *
   * @method render
   * @returns {HTMLElement} Contains the D3 chart
   */
  render() {
    const selection = d3.select(this.chartEl);

    selection.selectAll('*').remove();
    selection.call(this.draw());
  }

  /**
   * Append the data label to the element
   *
   * @method _addIdentifier
   * @param selection {Object} d3 select object
   */
  _addIdentifier(selection, labelProp) {
    labelProp = labelProp || 'label';
    const labels = this.handler.data.labels;

    function resolveLabel(datum) {
      if (labels.length === 1) return labels[0];
      if (datum[0]) return datum[0][labelProp];
      return datum[labelProp];
    }

    selection.each(function(datum) {
      const label = resolveLabel(datum);
      if (label != null) dataLabel(this, label);
    });
  }

  /**
   * Removes all DOM elements from the root element
   *
   * @method destroy
   */
  destroy() {
    const selection = d3.select(this.chartEl);
    this.events.removeAllListeners();
    this.tooltips.forEach(function(tooltip) {
      tooltip.destroy();
    });
    selection.remove();
  }
}
