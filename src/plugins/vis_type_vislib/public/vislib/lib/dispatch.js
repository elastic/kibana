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
import { get, pull, rest, size, reduce } from 'lodash';
import $ from 'jquery';
import { DIMMING_OPACITY_SETTING } from '../../../common';

/**
 * Handles event responses
 *
 * @class Dispatch
 * @constructor
 * @param handler {Object} Reference to Handler Class Object
 */
export class Dispatch {
  constructor(handler, uiSettings) {
    this.handler = handler;
    this.uiSettings = uiSettings;
    this._listeners = {};
  }

  /**
   * Add an event handler
   *
   * @param  {string} name
   * @param  {function} handler
   * @return {Dispatch} - this, for chaining
   */
  on(name, handler) {
    let handlers = this._listeners[name];
    if (!handlers) {
      this._listeners[name] = [];
      handlers = this._listeners[name];
    }

    handlers.push(handler);

    return this;
  }

  /**
   * Remove an event handler
   *
   * @param  {string} name
   * @param  {function} [handler] - optional handler to remove, if no handler is
   *                              passed then all are removed
   * @return {Dispatch} - this, for chaining
   */
  off(name, handler) {
    if (!this._listeners[name]) {
      return this;
    }

    // remove a specific handler
    if (handler) {
      pull(this._listeners[name], handler);
    }
    // or remove all listeners
    else {
      this._listeners[name] = null;
    }

    return this;
  }

  /**
   * Remove all event listeners bound to this emitter.
   *
   * @return {Dispatch} - this, for chaining
   */
  removeAllListeners() {
    this._listeners = {};
    return this;
  }

  /**
   * Emit an event and all arguments to all listeners for an event name
   *
   * @param  {string} name
   * @param  {*} [arg...] - any number of arguments that will be applied to each handler
   * @return {Dispatch} - this, for chaining
   */
  emit = rest(function (name, args) {
    if (!this._listeners[name]) {
      return this;
    }
    const listeners = this.listeners(name);
    let i = -1;

    while (++i < listeners.length) {
      listeners[i].apply(this, args);
    }

    return this;
  });

  /**
   * Get a list of the handler functions for a specific event
   *
   * @param  {string} name
   * @return {array[function]}
   */
  listeners(name) {
    return this._listeners[name] ? this._listeners[name].slice(0) : [];
  }

  /**
   * Get the count of handlers for a specific event
   *
   * @param  {string} [name] - optional event name to filter by
   * @return {number}
   */
  listenerCount(name) {
    if (name) {
      return size(this._listeners[name]);
    }

    return reduce(this._listeners, (count, handlers) => count + size(handlers), 0);
  }

  _pieClickResponse(data) {
    const points = [];

    let dataPointer = data;
    while (dataPointer && dataPointer.rawData) {
      points.push(dataPointer.rawData);
      dataPointer = dataPointer.parent;
    }

    if (get(data, 'rawData.table.$parent')) {
      const { table, column, row, key } = get(data, 'rawData.table.$parent');
      points.push({ table, column, row, value: key });
    }

    return points;
  }

  _seriesClickResponse(data) {
    const points = [];

    ['xRaw', 'yRaw', 'zRaw', 'seriesRaw', 'rawData', 'tableRaw'].forEach((val) => {
      if (data[val] && data[val].column !== undefined && data[val].row !== undefined) {
        points.push(data[val]);
      }
    });

    return points;
  }

  /**
   * Response to click  events
   *
   * @param d {Object} Data point
   * @returns event with list of data points related to the click
   */
  clickEventResponse(d, props = {}) {
    let isSlices = props.isSlices;
    if (isSlices === undefined) {
      const _data = d3.event.target.nearestViewportElement
        ? d3.event.target.nearestViewportElement.__data__
        : d3.event.target.__data__;
      isSlices = !!(_data && _data.slices);
    }

    const data = d.input || d;

    return {
      e: d3.event,
      data: isSlices ? this._pieClickResponse(data) : this._seriesClickResponse(data),
    };
  }

  /**
   * Determine whether rendering a series is configured in percentage mode
   * Used to display a value percentage formatted in it's popover
   *
   * @param rawId {string} The rawId of series to check
   * @param series {Array} Array of all series data
   * @param visConfig {VisConfig}
   * @returns {Boolean}
   */
  _isSeriesInPercentageMode(rawId, series, visConfig) {
    if (!rawId || !Array.isArray(series) || !visConfig) {
      return false;
    }
    //find the primary id by the rawId, that id is used in the config's seriesParams
    const { id } = series.find((series) => series.rawId === rawId);
    if (!id) {
      return false;
    }

    //find the matching seriesParams of the series, to get the id of the valueAxis
    const seriesParams = visConfig.get('seriesParams', []);
    const { valueAxis: valueAxisId } = seriesParams.find((param) => param.data.id === id) || {};
    if (!valueAxisId) {
      return false;
    }
    const usedValueAxis = visConfig
      .get('valueAxes', [])
      .find((valueAxis) => valueAxis.id === valueAxisId);
    return get(usedValueAxis, 'scale.mode') === 'percentage';
  }

  /**
   * Response to hover events
   *
   * @param d {Object} Data point
   * @param i {Number} Index number of data point
   * @returns {{value: *, point: *, label: *, color: *, pointIndex: *,
   * series: *, config: *, data: (Object|*),
   * e: (d3.event|*), handler: (Object|*)}} Event response object
   */
  eventResponse(d, i) {
    const datum = d._input || d;
    const data = d3.event.target.nearestViewportElement
      ? d3.event.target.nearestViewportElement.__data__
      : d3.event.target.__data__;
    const label = d.label ? d.label : d.series || 'Count';
    const isSeries = !!(data && data.series);
    const isSlices = !!(data && data.slices);
    const series = isSeries ? data.series : undefined;
    const slices = isSlices ? data.slices : undefined;
    const handler = this.handler;
    const color = get(handler, 'data.color');
    const config = handler && handler.visConfig;
    const isPercentageMode = this._isSeriesInPercentageMode(d.seriesId, series, config);

    const eventData = {
      value: d.y,
      point: datum,
      datum,
      label,
      color: color ? color(label) : undefined,
      pointIndex: i,
      series,
      slices,
      config,
      data,
      e: d3.event,
      handler,
      isPercentageMode,
    };

    return eventData;
  }

  /**
   * Returns a function that adds events and listeners to a D3 selection
   *
   * @method addEvent
   * @param event {String}
   * @param callback {Function}
   * @returns {Function}
   */
  addEvent(event, callback) {
    return function (selection) {
      selection.each(function () {
        const element = d3.select(this);

        if (typeof callback === 'function') {
          return element.on(event, callback);
        }
      });
    };
  }

  /**
   *
   * @method addHoverEvent
   * @returns {Function}
   */
  addHoverEvent() {
    const self = this;
    const isClickable = this.listenerCount('click') > 0;
    const addEvent = this.addEvent;
    const $el = this.handler.el;
    if (!this.handler.highlight) {
      this.handler.highlight = self.getHighlighter(self.uiSettings);
    }

    function hover(d, i) {
      // Add pointer if item is clickable
      if (isClickable) {
        self.addMousePointer.call(this, arguments);
      }

      self.handler.highlight.call(this, $el);
      self.emit('hover', self.eventResponse(d, i));
    }

    return addEvent('mouseover', hover);
  }

  /**
   *
   * @method addMouseoutEvent
   * @returns {Function}
   */
  addMouseoutEvent() {
    const self = this;
    const addEvent = this.addEvent;
    const $el = this.handler.el;
    if (!this.handler.unHighlight) {
      this.handler.unHighlight = self.unHighlight;
    }

    function mouseout() {
      self.handler.unHighlight.call(this, $el);
    }

    return addEvent('mouseout', mouseout);
  }

  /**
   *
   * @method addClickEvent
   * @returns {Function}
   */
  addClickEvent() {
    const onClick = (d) => this.emit('click', this.clickEventResponse(d));

    return this.addEvent('click', onClick);
  }

  /**
   * Determine if we will allow brushing
   *
   * @method allowBrushing
   * @returns {Boolean}
   */
  allowBrushing() {
    const xAxis = this.handler.categoryAxes[0];

    //Allow brushing for ordered axis - date histogram and histogram
    return Boolean(xAxis.ordered);
  }

  /**
   * Determine if brushing is currently enabled
   *
   * @method isBrushable
   * @returns {Boolean}
   */
  isBrushable() {
    return this.allowBrushing() && this.listenerCount('brush') > 0;
  }

  /**
   *
   * @param svg
   * @returns {Function}
   */
  addBrushEvent(svg) {
    if (!this.isBrushable()) return;

    const xScale = this.handler.categoryAxes[0].getScale();
    this.createBrush(xScale, svg);
  }

  /**
   * Mouseover Behavior
   *
   * @method addMousePointer
   * @returns {d3.Selection}
   */
  addMousePointer() {
    return d3.select(this).style('cursor', 'pointer');
  }

  /**
   * return function to Highlight the element that is under the cursor
   * by reducing the opacity of all the elements on the graph.
   * @param uiSettings
   * @method getHighlighter
   */
  getHighlighter(uiSettings) {
    return function highlight(element) {
      const label = this.getAttribute('data-label');
      if (!label) return;
      const dimming = uiSettings.get(DIMMING_OPACITY_SETTING);
      $(element)
        .parent()
        .find('[data-label]')
        .css('opacity', 1) //Opacity 1 is needed to avoid the css application
        .not((els, el) => String($(el).data('label')) === label)
        .css('opacity', justifyOpacity(dimming));
    };
  }

  /**
   * Mouseout Behavior
   *
   * @param element {d3.Selection}
   * @method unHighlight
   */
  unHighlight(element) {
    $('[data-label]', element.parentNode).css('opacity', 1);
  }

  /**
   * Adds D3 brush to SVG and returns the brush function
   *
   * @param xScale {Function} D3 xScale function
   * @param svg {HTMLElement} Reference to SVG
   * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
   */
  createBrush(xScale, svg) {
    const self = this;
    const visConfig = self.handler.visConfig;
    const { width, height } = svg.node().getBBox();
    const isHorizontal = self.handler.categoryAxes[0].axisConfig.isHorizontal();

    // Brush scale
    const brush = d3.svg.brush();
    if (isHorizontal) {
      brush.x(xScale);
    } else {
      brush.y(xScale);
    }

    brush.on('brushend', function brushEnd() {
      // Assumes data is selected at the chart level
      // In this case, the number of data objects should always be 1
      const data = d3.select(this).data()[0];
      const isTimeSeries = data.ordered && data.ordered.date;

      // Allows for brushing on d3.scale.ordinal()
      const selected = xScale
        .domain()
        .filter((d) => brush.extent()[0] <= xScale(d) && xScale(d) <= brush.extent()[1]);
      const range = isTimeSeries ? brush.extent() : selected;

      return self.emit('brush', {
        range,
        config: visConfig,
        e: d3.event,
        data,
      });
    });

    // if `addBrushing` is true, add brush canvas
    if (self.listenerCount('brush')) {
      const rect = svg
        .insert('g', 'g')
        .attr('class', 'brush')
        .call(brush)
        .call((brushG) => {
          // hijack the brush start event to filter out right/middle clicks
          const brushHandler = brushG.on('mousedown.brush');
          if (!brushHandler) return; // touch events in use
          brushG.on('mousedown.brush', function () {
            if (validBrushClick(d3.event)) brushHandler.apply(this, arguments);
          });
        })
        .selectAll('rect');

      if (isHorizontal) {
        rect.attr('height', height);
      } else {
        rect.attr('width', width);
      }

      return brush;
    }
  }
}

function validBrushClick(event) {
  return event.button === 0;
}

function justifyOpacity(opacity) {
  const decimalNumber = parseFloat(opacity, 10);
  const fallbackOpacity = 0.5;
  return 0 <= decimalNumber && decimalNumber <= 1 ? decimalNumber : fallbackOpacity;
}
