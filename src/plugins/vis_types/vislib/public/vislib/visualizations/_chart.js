/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import d3 from 'd3';
import _ from 'lodash';

import { dataLabel } from '../lib/_data_label';
import { Dispatch } from '../lib/dispatch';
import { getFormatService } from '../../services';
import { Tooltip, pointSeriesTooltipFormatter } from '../components/tooltip';

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
  constructor(handler, element, chartData, uiSettings) {
    this.handler = handler;
    this.chartEl = element;
    this.chartData = chartData;
    this.tooltips = [];

    const events = (this.events = new Dispatch(handler, uiSettings));

    const fieldFormatter = getFormatService().deserialize(
      this.handler.data.get('tooltipFormatter')
    );
    const tooltipFormatterProvider = pointSeriesTooltipFormatter;
    const tooltipFormatter = tooltipFormatterProvider(fieldFormatter);

    if (this.handler.visConfig && this.handler.visConfig.get('addTooltip', false)) {
      const element = this.handler.el;

      // Add tooltip
      this.tooltip = new Tooltip('chart', element, tooltipFormatter, events, uiSettings);
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

    selection.each(function (datum) {
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
    this.tooltips.forEach(function (tooltip) {
      tooltip.destroy();
    });
    selection.remove();
  }
}
