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
import d3 from 'd3';
import { KbnError } from '../errors';
import { EventsProvider } from '../events';
import { VislibVisConfigProvider } from './lib/vis_config';
import { VisHandlerProvider } from './lib/handler';

export function VislibVisProvider(Private) {
  const Events = Private(EventsProvider);
  const VisConfig = Private(VislibVisConfigProvider);
  const Handler = Private(VisHandlerProvider);

  /**
   * Creates the visualizations.
   *
   * @class Vis
   * @constructor
   * @param $el {HTMLElement} jQuery selected HTML element
   * @param config {Object} Parameters that define the chart type and chart options
   */
  class Vis extends Events {
    constructor($el, visConfigArgs) {
      super(arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.visConfigArgs = _.cloneDeep(visConfigArgs);
    }

    hasLegend() {
      return this.visConfigArgs.addLegend;
    }

    initVisConfig(data, uiState) {
      this.data = data;

      this.uiState = uiState;

      this.visConfig = new VisConfig(this.visConfigArgs, this.data, this.uiState, this.el);
    }

    /**
     * Renders the visualization
     *
     * @method render
     * @param data {Object} Elasticsearch query results
     */
    render(data, uiState) {
      if (!data) {
        throw new Error('No valid data!');
      }

      if (this.handler) {
        this.data = null;
        this._runOnHandler('destroy');
      }

      this.initVisConfig(data, uiState);

      this.handler = new Handler(this, this.visConfig);
      this._runOnHandler('render');
    }

    getLegendLabels() {
      return this.visConfig ? this.visConfig.get('legend.labels', null) : null;
    }

    getLegendColors() {
      return this.visConfig ? this.visConfig.get('legend.colors', null) : null;
    }

    _runOnHandler(method) {
      try {
        this.handler[method]();
      } catch (error) {

        if (error instanceof KbnError) {
          error.displayToScreen(this.handler);
        } else {
          throw error;
        }

      }
    }

    /**
     * Destroys the visualization
     * Removes chart and all elements associated with it.
     * Removes chart and all elements associated with it.
     * Remove event listeners and pass destroy call down to owned objects.
     *
     * @method destroy
     */
    destroy() {
      const selection = d3.select(this.el).select('.visWrapper');

      if (this.handler) this._runOnHandler('destroy');

      selection.remove();
    }

    /**
     * Sets attributes on the visualization
     *
     * @method set
     * @param name {String} An attribute name
     * @param val {*} Value to which the attribute name is set
     */
    set(name, val) {
      this.visConfigArgs[name] = val;
      this.render(this.data, this.uiState);
    }

    /**
     * Gets attributes from the visualization
     *
     * @method get
     * @param name {String} An attribute name
     * @returns {*} The value of the attribute name
     */
    get(name) {
      return this.visConfig.get(name);
    }

    /**
     * Turns on event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    on(event, listener) {
      const first = this.listenerCount(event) === 0;
      const ret = Events.prototype.on.call(this, event, listener);
      const added = this.listenerCount(event) > 0;

      // if this is the first listener added for the event
      // enable the event in the handler
      if (first && added && this.handler) this.handler.enable(event);

      return ret;
    }

    /**
     * Turns off event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    off(event, listener) {
      const last = this.listenerCount(event) === 1;
      const ret = Events.prototype.off.call(this, event, listener);
      const removed = this.listenerCount(event) === 0;

      // Once all listeners are removed, disable the events in the handler
      if (last && removed && this.handler) this.handler.disable(event);
      return ret;
    }
  }

  return Vis;
}
