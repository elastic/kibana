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

import $ from 'jquery';
import moment from 'moment';
import dateMath from '@kbn/datemath';
import * as vega from 'vega-lib';
import * as vegaLite from 'vega-lite';
import { Utils } from '../data_model/utils';
import { VISUALIZATION_COLORS } from '@elastic/eui';
import { TooltipHandler } from './vega_tooltip';
import { buildQueryFilter } from 'ui/filter_manager/lib';
import { createDashboardEditUrl } from 'plugins/kibana/dashboard/dashboard_constants';
import rison from 'rison-node';

vega.scheme('elastic', VISUALIZATION_COLORS);

// Vega's extension functions are global. When called,
// we forward execution to the instance-specific handler
// This functions must be declared in the VegaBaseView class
const vegaFunctions = {
  kibanaAddFilter: 'addFilterHandler',
  kibanaRemoveFilter: 'removeFilterHandler',
  kibanaRemoveAllFilters: 'removeAllFiltersHandler',
  kibanaSetTimeFilter: 'setTimeFilterHandler',
  kibanaOpenDashboard: 'openDashboardHandler',
};

for (const funcName of Object.keys(vegaFunctions)) {
  if (!vega.expressionFunction(funcName)) {
    vega.expressionFunction(
      funcName,
      function handlerFwd(...args) {
        const view = this.context.dataflow;
        view.runAfter(() => view._kibanaView.vegaFunctionsHandler(funcName, ...args));
      }
    );
  }
}

const bypassToken = Symbol();

export function bypassExternalUrlCheck(url) {
  // processed in the  loader.sanitize  below
  return { url, bypassToken };
}

export class VegaBaseView {
  constructor(opts) {
    // $rootScope is a temp workaround, see usage below
    this._$rootScope = opts.$rootScope;
    this._vegaConfig = opts.vegaConfig;
    this._$parentEl = $(opts.parentEl);
    this._parser = opts.vegaParser;
    this._serviceSettings = opts.serviceSettings;
    this._queryfilter = opts.queryfilter;
    this._timefilter = opts.timefilter;
    this._findIndex = opts.findIndex;
    this._kbnUrl = opts.kbnUrl;
    this._savedObjectsClient = opts.savedObjectsClient;
    this._getAppState = opts.getAppState;
    this._view = null;
    this._vegaViewConfig = null;
    this._$messages = null;
    this._destroyHandlers = [];
    this._initialized = false;
  }

  async init() {
    if (this._initialized) throw new Error();  // safety
    this._initialized = true;

    try {
      this._$parentEl.empty()
        .addClass('vega-main')
        .css('flex-direction', this._parser.containerDir);

      // bypass the onWarn warning checks - in some cases warnings may still need to be shown despite being disabled
      for (const warn of this._parser.warnings) {
        this._addMessage('warn', warn);
      }

      if (this._parser.error) {
        this._addMessage('err', this._parser.error);
        return;
      }

      this._$container = $('<div class="vega-view-container">')
        .appendTo(this._$parentEl);
      this._$controls = $('<div class="vega-controls-container">')
        .css('flex-direction', this._parser.controlsDir)
        .appendTo(this._$parentEl);

      this._addDestroyHandler(() => {
        if (this._$container) {
          this._$container.remove();
          this._$container = null;
        }
        if (this._$controls) {
          this._$controls.remove();
          this._$controls = null;
        }
        if (this._$messages) {
          this._$messages.remove();
          this._$messages = null;
        }
        if (this._view) {
          this._view.finalize();
        }
        this._view = null;
      });

      this._vegaViewConfig = this.createViewConfig();

      // The derived class should create this method
      await this._initViewCustomizations();
    } catch (err) {
      this.onError(err);
    }
  }

  createViewConfig() {
    const config = {
      logLevel: vega.Warn,
      renderer: this._parser.renderer,
    };

    // Override URL sanitizer to prevent external data loading (if disabled)
    const loader = vega.loader();
    const originalSanitize = loader.sanitize.bind(loader);
    loader.sanitize = (uri, options) => {
      if (uri.bypassToken === bypassToken) {
        // If uri has a bypass token, the uri was encoded by bypassExternalUrlCheck() above.
        // because user can only supply pure JSON data structure.
        uri = uri.url;
      } else if (!this._vegaConfig.enableExternalUrls) {
        throw new Error('External URLs are not enabled. Add   vega.enableExternalUrls: true   to kibana.yml');
      }
      return originalSanitize(uri, options);
    };
    config.loader = loader;

    return config;
  }

  onError() {
    this._addMessage('err', Utils.formatErrorToStr(...arguments));
  }

  onWarn() {
    if (!this._parser || !this._parser.hideWarnings) {
      this._addMessage('warn', Utils.formatWarningToStr(...arguments));
    }
  }

  _addMessage(type, text) {
    if (!this._$messages) {
      this._$messages = $(`<ul class="vega-messages">`).appendTo(this._$parentEl);
    }
    this._$messages.append(
      $(`<li class="vega-message-${type}">`).append(
        $(`<pre>`).text(text)
      )
    );
  }

  resize() {
    if (this._parser.useResize && this._view && this.updateVegaSize(this._view)) {
      return this._view.runAsync();
    }
  }

  updateVegaSize(view) {
    // For some reason the object is slightly scrollable without the extra padding.
    // This might be due to https://github.com/jquery/jquery/issues/3808
    // Which is being fixed as part of jQuery 3.3.0
    const heightExtraPadding = 6;
    const width = Math.max(0, this._$container.width() - this._parser.paddingWidth);
    const height = Math.max(0, this._$container.height() - this._parser.paddingHeight) - heightExtraPadding;
    if (view.width() !== width || view.height() !== height) {
      view.width(width).height(height);
      return true;
    }
    return false;
  }

  setView(view) {
    if (this._view === view) return;

    if (this._view) {
      this._view.finalize();
    }

    this._view = view;

    if (view) {

      // Global vega expression handler uses it to call custom functions
      view._kibanaView = this;

      if (this._parser.tooltips) {
        // position and padding can be specified with
        // {config:{kibana:{tooltips: {position: 'top', padding: 15 } }}}
        const tthandler = new TooltipHandler(this._$container[0], view, this._parser.tooltips);

        // Vega bug workaround - need to destroy tooltip by hand
        this._addDestroyHandler(() => tthandler.hideTooltip());
      }

      return view.runAsync(); // Allows callers to await rendering
    }
  }

  /**
   * Handle
   * @param funcName
   * @param args
   * @returns {Promise<void>}
   */
  async vegaFunctionsHandler(funcName, ...args) {
    try {
      const handlerFunc = vegaFunctions[funcName];
      if (!handlerFunc || !this[handlerFunc]) {
        // in case functions don't match the list above
        throw new Error(`${funcName}() is not defined for this graph`);
      }
      await this[handlerFunc](...args);
    } catch (err) {
      this.onError(err);
    }
  }

  /**
   * @param {object} query Elastic Query DSL snippet, as used in the query DSL editor
   * @param {string} [index] as defined in Kibana, or default if missing
   */
  async addFilterHandler(query, index) {
    const indexId = await this._findIndex(index);
    const filter = buildQueryFilter(query, indexId);
    await this._queryfilter.addFilters(filter);
  }

  /**
   * @param {object} query Elastic Query DSL snippet, as used in the query DSL editor
   * @param {string} [index] as defined in Kibana, or default if missing
   */
  async removeFilterHandler(query, index) {
    const indexId = await this._findIndex(index);
    const filter = buildQueryFilter(query, indexId);

    // This is a workaround for the https://github.com/elastic/kibana/issues/18863
    // Once fixed, replace with a direct call (no await is needed because its not async)
    //    this._queryfilter.removeFilter(filter);
    this._$rootScope.$evalAsync(() => {
      try {
        this._queryfilter.removeFilter(filter);
      } catch (err) {
        this.onError(err);
      }
    });
  }

  removeAllFiltersHandler() {
    this._queryfilter.removeAll();
  }

  /**
   * Update dashboard time filter to the new values
   * @param {number|string|Date} start
   * @param {number|string|Date} end
   */
  setTimeFilterHandler(start, end) {
    this._timefilter.setTime(VegaBaseView._parseTimeRange(start, end));
  }

  /**
   * Parse start and end values, determining the mode, and if order should be reversed
   * @private
   */
  static _parseTimeRange(start, end) {
    const absStart = moment(start);
    const absEnd = moment(end);
    const isValidAbsStart = absStart.isValid();
    const isValidAbsEnd = absEnd.isValid();
    let mode = 'absolute';
    let from;
    let to;
    let reverse;

    if (isValidAbsStart && isValidAbsEnd) {
      // Both are valid absolute dates.
      from = absStart;
      to = absEnd;
      reverse = absStart.isAfter(absEnd);
    } else {
      // Try to parse as relative dates too (absolute dates will also be accepted)
      const startDate = dateMath.parse(start);
      const endDate = dateMath.parse(end);
      if (!startDate || !endDate || !startDate.isValid() || !endDate.isValid()) {
        throw new Error(`Error setting time filter: both time values must be either relative or absolute dates. ` +
          `start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
      }
      reverse = startDate.isAfter(endDate);
      if (isValidAbsStart || isValidAbsEnd) {
        // Mixing relative and absolute - treat them as absolute
        from = startDate;
        to = endDate;
      } else {
        // Both dates are relative
        mode = 'relative';
        from = start;
        to = end;
      }
    }

    if (reverse) {
      [from, to] = [to, from];
    }

    return { from, to, mode };
  }

  /**
   * Open dashboard with a given title
   * @param {object} [options]
   * @param {string} [options.id] dashboard ID (must be set, unless title is given)
   * @param {string} [options.title] dashboard title
   * @param {boolean} [options.openInSameWindow] by default, opens in a new tab
   * @param {object|object[]} [options.addFilters] one or several filters to add
   * @param {boolean} [options.clearFilters] if true, does not preserve current filters
   * @param {object} [options.setTime] if set, overrides current time range with new values
   * @param {number|string|Date} [options.setTime.start]
   * @param {number|string|Date} [options.setTime.end]
   */
  async openDashboardHandler(options) {
    // Ideally, this method should use internal Kibana API
    // to create the encoded URL and pass proper state params.
    // Unfortunately, Kibana is not well suited for that yet (per @gammon),
    // who suggested to use the URL method (_g and _a parameters),
    // as they tend to be stable between different versions.
    // Also note that unless user sets dashboard id parameter, this code
    // does a server-call to resolve title -> id. This is ok when opening
    // dashboard in the same window, but will cause popup browser block
    // if opening in a new tab.
    // One solution is to allow src/core_plugins/kibana/public/dashboard/index.js
    // to preserve the _a and _g params when handling LANDING_PAGE_PATH with tile=...
    try {
      options = options || {};

      let dashboardId = options.id;
      if (!dashboardId) {
        if (!options.title) {
          throw new Error('kibanaOpenDashboard() cannot open dashboard without an id or title');
        }
        dashboardId = await this._titleToDashboardId(options.title);
      }

      const appState = this._getAppState();

      const globalData = {};
      const appData = {};

      const time = options.setTime;
      if (!time) {
        // Preserve current dashboard timerange
        const tf = this._timefilter;
        globalData.time = {
          from: tf.time.from,
          to: tf.time.to,
        };
      } else {
        if (typeof time !== 'object') {
          throw new Error('kibanaOpenDashboard() setTime parameter must be an object with start, end');
        }
        // set new time values
        globalData.time = VegaBaseView._parseTimeRange(time.start, time.end);
      }

      if (!options.clearFilters) {
        // Preserve current dashboard filters and query string
        if (appState.filters && appState.filters.length > 0) {
          appData.filters = appState.filters;
        }
        if (appState.query.query) {
          appData.query = appState.query;
        }
      }

      let addFilters = options.addFilters;
      if (addFilters) {
        if (typeof addFilters !== 'object') {
          throw new Error(`"addFilters" parameter must be an object or an array of objects`);
        }
        if (!Array.isArray(addFilters)) {
          addFilters = [addFilters];
        }
        const indexId = await this._findIndex();
        addFilters = addFilters.map(query => buildQueryFilter(query, indexId));
        appData.filters = [...(appData.filters || []), ...addFilters];
      }

      const gParam = rison.encode(globalData);
      const aParam = rison.encode(appData);

      const url = `${createDashboardEditUrl(dashboardId)}?_g=${gParam}&_a=${aParam}`;

      if (!options.openInSameWindow) {
        window.open('#' + url, '_blank');
      } else {
        this._kbnUrl.change(url);
      }
    } catch (err) {
      this.onError(err);
    }
  }

  async _titleToDashboardId(title) {
    // Adapted from src/core_plugins/kibana/public/dashboard/index.js
    const results = await this._savedObjectsClient.find({
      search: `"${title}"`,
      search_fields: 'title',
      type: 'dashboard',
    });

    // The search isn't an exact match,
    // lets see if we can find a single exact match to use
    let matchingDashboards = results.savedObjects.filter(
      dashboard => dashboard.attributes.title === title);
    if (matchingDashboards.length === 0) {
      const titleLower = title.toLowerCase();
      matchingDashboards = results.savedObjects.filter(
        dashboard => dashboard.attributes.title.toLowerCase() === titleLower);
    }
    if (matchingDashboards.length !== 1) {
      throw new Error(`Unable to find dashboard "${title}"`);
    }

    return matchingDashboards[0].id;
  }

  /**
   * Set global debug variable to simplify vega debugging in console. Show info message first time
   */
  setDebugValues(view, spec, vlspec) {
    if (window) {
      if (window.VEGA_DEBUG === undefined && console) {
        console.log('%cWelcome to Kibana Vega Plugin!', 'font-size: 16px; font-weight: bold;');
        console.log('You can access the Vega view with VEGA_DEBUG. ' +
          'Learn more at https://vega.github.io/vega/docs/api/debugging/.');
      }
      const debugObj = {};
      window.VEGA_DEBUG = debugObj;
      window.VEGA_DEBUG.VEGA_VERSION = vega.version;
      window.VEGA_DEBUG.VEGA_LITE_VERSION = vegaLite.version;
      window.VEGA_DEBUG.view = view;
      window.VEGA_DEBUG.vega_spec = spec;
      window.VEGA_DEBUG.vegalite_spec = vlspec;

      // On dispose, clean up, but don't use undefined to prevent repeated debug statements
      this._addDestroyHandler(() => {
        if (debugObj === window.VEGA_DEBUG) {
          window.VEGA_DEBUG = null;
        }
      });
    }
  }

  destroy() {
    // properly handle multiple destroy() calls by converting this._destroyHandlers
    // into the _ongoingDestroy promise, while handlers are being disposed
    if (this._destroyHandlers) {
      // If no destroy is yet running, execute all handlers and wait for all of them to resolve.
      this._ongoingDestroy = Promise.all(this._destroyHandlers.map(v => v()));
      this._destroyHandlers = null;
    }
    return this._ongoingDestroy;
  }

  _addDestroyHandler(handler) {
    // If disposing hasn't started yet, enqueue it, otherwise dispose right away
    // This creates a minor issue - if disposing has started but not yet finished,
    // and we dispose the new handler right away, the destroy() does not wait for it.
    // This behavior is no different from the case when disposing has already completed,
    // so it shouldn't create any issues.
    if (this._destroyHandlers) {
      this._destroyHandlers.push(handler);
    } else {
      handler();
    }
  }
}
