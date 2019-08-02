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
import MarkdownIt from 'markdown-it';
import { NoResults } from '../../errors';
import { Binder } from '../../binder';
import { Layout } from './layout/layout';
import { ChartTitle } from './chart_title';
import { Alerts } from './alerts';
import { Axis } from './axis/axis';
import { ChartGrid as Grid } from './chart_grid';
import { visTypes as chartTypes } from '../visualizations/vis_types';
import { dispatchRenderComplete } from '../../render_complete';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});


/**
 * Handles building all the components of the visualization
 *
 * @class Handler
 * @constructor
 * @param vis {Object} Reference to the Vis Class Constructor
 * @param opts {Object} Reference to Visualization constructors needed to
 * create the visualization
 */
export class Handler {
  constructor(vis, visConfig) {
    this.el = visConfig.get('el');
    this.ChartClass = chartTypes[visConfig.get('type')];
    this.charts = [];

    this.vis = vis;
    this.visConfig = visConfig;
    this.data = visConfig.data;

    this.categoryAxes = visConfig.get('categoryAxes').map(axisArgs => new Axis(visConfig, axisArgs));
    this.valueAxes = visConfig.get('valueAxes').map(axisArgs => new Axis(visConfig, axisArgs));
    this.chartTitle = new ChartTitle(visConfig);
    this.alerts = new Alerts(this, visConfig.get('alerts'));
    this.grid = new Grid(this, visConfig.get('grid'));

    if (visConfig.get('type') === 'point_series') {
      this.data.stackData(this);
    }

    if (visConfig.get('resize', false)) {
      this.resize = visConfig.get('resize');
    }

    this.layout = new Layout(visConfig);
    this.binder = new Binder();
    this.renderArray = _.filter([
      this.layout,
      this.chartTitle,
      this.alerts
    ], Boolean);

    this.renderArray = this.renderArray
      .concat(this.valueAxes)
      // category axes need to render in reverse order https://github.com/elastic/kibana/issues/13551
      .concat(this.categoryAxes.slice().reverse());

    // memoize so that the same function is returned every time,
    // allowing us to remove/re-add the same function
    this.getProxyHandler = _.memoize(function (event) {
      const self = this;
      return function (e) {
        self.vis.emit(event, e);
      };
    });

    /**
     * Enables events, i.e. binds specific events to the chart
     * object(s) `on` method. For example, `click` or `mousedown` events.
     *
     * @method enable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    this.enable = this.chartEventProxyToggle('on');

    /**
     * Disables events for all charts
     *
     * @method disable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    this.disable = this.chartEventProxyToggle('off');
  }
  /**
   * Validates whether data is actually present in the data object
   * used to render the Vis. Throws a no results error if data is not
   * present.
   *
   * @private
   */
  _validateData() {
    const dataType = this.data.type;

    if (!dataType) {
      throw new NoResults();
    }
  }

  /**
   * Renders the constructors that create the visualization,
   * including the chart constructor
   *
   * @method render
   * @returns {HTMLElement} With the visualization child element
   */
  render() {
    if (this.visConfig.get('error', null)) return this.error(this.visConfig.get('error'));

    const self = this;
    const { binder, charts = [] } = this;
    const selection = d3.select(this.el);

    selection.selectAll('*').remove();

    this._validateData();
    this.renderArray.forEach(function (property) {
      if (typeof property.render === 'function') {
        property.render();
      }
    });

    // render the chart(s)
    let loadedCount = 0;
    const chartSelection = selection.selectAll('.chart');
    chartSelection.each(function (chartData) {
      const chart = new self.ChartClass(self, this, chartData);

      self.vis.activeEvents().forEach(function (event) {
        self.enable(event, chart);
      });

      binder.on(chart.events, 'rendered', () => {
        loadedCount++;
        if (loadedCount === chartSelection.length) {
          // events from all charts are propagated to vis, we only need to fire renderComplete once they all finish
          self.vis.emit('renderComplete');
        }
      });

      charts.push(chart);
      chart.render();
    });
  }

  chartEventProxyToggle(method) {
    return function (event, chart) {
      const proxyHandler = this.getProxyHandler(event);

      _.each(chart ? [chart] : this.charts, function (chart) {
        chart.events[method](event, proxyHandler);
      });
    };
  }

  /**
   * Removes all DOM elements from the HTML element provided
   *
   * @method removeAll
   * @param el {HTMLElement} Reference to the HTML Element that
   * contains the chart
   * @returns {D3.Selection|D3.Transition.Transition} With the chart
   * child element removed
   */
  removeAll(el) {
    return d3.select(el).selectAll('*').remove();
  }

  /**
   * Displays an error message in the DOM
   *
   * @method error
   * @param message {String} Error message to display
   * @returns {HTMLElement} Displays the input message
   */
  error(message) {
    this.removeAll(this.el);

    const div = d3.select(this.el)
      .append('div')
      // class name needs `chart` in it for the polling checkSize function
      // to continuously call render on resize
      .attr('class', 'visError chart error')
      .attr('data-test-subj', 'visLibVisualizeError');

    div.append('h4').text(markdownIt.renderInline(message));

    dispatchRenderComplete(this.el);
    return div;
  }

  /**
   * Destroys all the charts in the visualization
   *
   * @method destroy
   */
  destroy() {
    this.binder.destroy();

    this.renderArray.forEach(function (renderable) {
      if (_.isFunction(renderable.destroy)) {
        renderable.destroy();
      }
    });

    this.charts.splice(0).forEach(function (chart) {
      if (_.isFunction(chart.destroy)) {
        chart.destroy();
      }
    });
  }
}
