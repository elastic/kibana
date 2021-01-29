/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import d3 from 'd3';
import { EventEmitter } from 'events';

import { VislibError } from './errors';
import { VisConfig } from './lib/vis_config';
import { Handler } from './lib/handler';
import { DIMMING_OPACITY_SETTING, HEATMAP_MAX_BUCKETS_SETTING } from '../../common';

/**
 * Creates the visualizations.
 *
 * @class Vis
 * @constructor
 * @param element {HTMLElement} jQuery selected HTML element
 * @param config {Object} Parameters that define the chart type and chart options
 */
export class Vis extends EventEmitter {
  constructor(element, visConfigArgs, core, charts) {
    super();
    this.element = element.get ? element.get(0) : element;
    this.visConfigArgs = _.cloneDeep(visConfigArgs);
    this.visConfigArgs.dimmingOpacity = core.uiSettings.get(DIMMING_OPACITY_SETTING);
    this.visConfigArgs.heatmapMaxBuckets = core.uiSettings.get(HEATMAP_MAX_BUCKETS_SETTING);
    this.charts = charts;
    this.uiSettings = core.uiSettings;
  }

  hasLegend() {
    return this.visConfigArgs.addLegend;
  }

  initVisConfig(data, uiState) {
    this.data = data;
    this.uiState = uiState;
    this.visConfig = new VisConfig(
      this.visConfigArgs,
      this.data,
      this.uiState,
      this.element,
      this.charts.legacyColors.createColorLookupFunction.bind(this.charts.legacyColors)
    );
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

    this.handler = new Handler(this, this.visConfig, this.uiSettings);
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
      if (error instanceof VislibError) {
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
    const selection = d3.select(this.element).select('.visWrapper');

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
    const ret = EventEmitter.prototype.on.call(this, event, listener);
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
    const ret = EventEmitter.prototype.off.call(this, event, listener);
    const removed = this.listenerCount(event) === 0;

    // Once all listeners are removed, disable the events in the handler
    if (last && removed && this.handler) this.handler.disable(event);
    return ret;
  }

  removeAllListeners(event) {
    const ret = EventEmitter.prototype.removeAllListeners.call(this, event);
    this.handler.disable(event);
    return ret;
  }
}
