/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import $ from 'jquery';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import { scheme, loader, logger, Warn, version as vegaVersion, expressionFunction } from 'vega';
import { expressionInterpreter } from 'vega-interpreter';
import { version as vegaLiteVersion } from 'vega-lite';
import { Utils } from '../data_model/utils';
import { euiPaletteColorBlind } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildQueryFilter, compareFilters } from '@kbn/es-query';
import { TooltipHandler } from './vega_tooltip';

import { getEnableExternalUrls, getDataViews } from '../services';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';

scheme('elastic', euiPaletteColorBlind());

// Vega's extension functions are global. When called,
// we forward execution to the instance-specific handler
// This functions must be declared in the VegaBaseView class
const vegaFunctions = {
  kibanaAddFilter: 'addFilterHandler',
  kibanaRemoveFilter: 'removeFilterHandler',
  kibanaRemoveAllFilters: 'removeAllFiltersHandler',
  kibanaSetTimeFilter: 'setTimeFilterHandler',
};

for (const funcName of Object.keys(vegaFunctions)) {
  if (!expressionFunction(funcName)) {
    expressionFunction(funcName, function handlerFwd(...args) {
      const view = this.context.dataflow;
      view.runAfter(() => view._kibanaView.vegaFunctionsHandler(funcName, ...args));
    });
  }
}

const bypassToken = Symbol();

export function bypassExternalUrlCheck(url) {
  // processed in the  loader.sanitize  below
  return { url, bypassToken };
}

const getExternalUrlsAreNotEnabledError = () =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.externalUrlsAreNotEnabledErrorMessage', {
      defaultMessage:
        'External URLs are not enabled. Add {enableExternalUrls} to {kibanaConfigFileName}',
      values: {
        enableExternalUrls: 'vis_type_vega.enableExternalUrls: true',
        kibanaConfigFileName: 'kibana.yml',
      },
    })
  );

const getExternalUrlServiceError = (uri) =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.externalUrlServiceErrorMessage', {
      defaultMessage:
        'External URL [{uri}] was denied by ExternalUrl service. You can configure external URL policies using "{externalUrlPolicy}" setting in {kibanaConfigFileName}.',
      values: {
        uri,
        externalUrlPolicy: 'externalUrl.policy',
        kibanaConfigFileName: 'kibana.yml',
      },
    })
  );

export class VegaBaseView {
  constructor(opts) {
    this._$parentEl = $(opts.parentEl);
    this._parser = opts.vegaParser;
    this._serviceSettings = opts.serviceSettings;
    this._filterManager = opts.filterManager;
    this._fireEvent = opts.fireEvent;
    this._timefilter = opts.timefilter;
    this._view = null;
    this._vegaViewConfig = null;
    this._$messages = null;
    this._destroyHandlers = [];
    this._initialized = false;
    this._externalUrl = opts.externalUrl;
    this._enableExternalUrls = getEnableExternalUrls();
    this._renderMode = opts.renderMode;
    this._vegaStateRestorer = opts.vegaStateRestorer;
  }

  async init() {
    if (this._initialized) throw new Error(); // safety
    this._initialized = true;

    try {
      this._$parentEl.empty().addClass(`vgaVis`).css('flex-direction', this._parser.containerDir);

      // bypass the onWarn warning checks - in some cases warnings may still need to be shown despite being disabled
      for (const warn of this._parser.warnings) {
        this._addMessage('warn', warn);
      }

      if (this._parser.error) {
        this.onError(this._parser.error);
        return;
      }

      this._$container = $('<div class="vgaVis__view">')
        // Force a height here because css is not loaded in mocha test
        .css('height', '100%')
        .appendTo(this._$parentEl);
      this._$controls = $(
        `<div class="vgaVis__controls vgaVis__controls--${this._parser.controlsDir}">`
      ).appendTo(this._$parentEl);

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
          const state = this._view.getState();
          if (state) {
            this._vegaStateRestorer.save(state);
          }
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

  /**
   * Find index pattern by its title, if not given, gets it from spec or a defaults one
   * @param {string} [index]
   * @returns {Promise<string>} index id
   */
  async findIndex(index) {
    const dataViews = getDataViews();
    let idxObj;

    if (index) {
      [idxObj] = await dataViews.find(index);
      if (!idxObj) {
        throw new Error(
          i18n.translate('visTypeVega.vegaParser.baseView.indexNotFoundErrorMessage', {
            defaultMessage: 'Index {index} not found',
            values: { index: `"${index}"` },
          })
        );
      }
    } else {
      [idxObj] = await extractIndexPatternsFromSpec(
        this._parser.isVegaLite ? this._parser.vlspec : this._parser.spec
      );

      if (!idxObj) {
        const defaultIdx = await dataViews.getDefault();

        if (defaultIdx) {
          idxObj = defaultIdx;
        } else {
          throw new Error(
            i18n.translate('visTypeVega.vegaParser.baseView.unableToFindDefaultIndexErrorMessage', {
              defaultMessage: 'Unable to find default index',
            })
          );
        }
      }
    }

    return idxObj.id;
  }

  handleExternalUrlError(externalUrlError) {
    this.onError(externalUrlError);
    throw externalUrlError;
  }

  createViewConfig() {
    const config = {
      expr: expressionInterpreter,
      renderer: this._parser.renderer,
    };

    // Override URL sanitizer to prevent external data loading (if disabled)
    const vegaLoader = loader();
    const originalSanitize = vegaLoader.sanitize.bind(vegaLoader);
    vegaLoader.sanitize = async (uri, options) => {
      if (uri.bypassToken === bypassToken || this._externalUrl.isInternalUrl(uri)) {
        // If uri has a bypass token, the uri was encoded by bypassExternalUrlCheck() above.
        // because user can only supply pure JSON data structure.
        uri = uri.url;
      } else if (!this._enableExternalUrls) {
        this.handleExternalUrlError(getExternalUrlsAreNotEnabledError());
      } else if (!this._externalUrl.validateUrl(uri)) {
        this.handleExternalUrlError(getExternalUrlServiceError(uri));
      }
      const result = await originalSanitize(uri, options);
      // This will allow Vega users to load images from any domain.
      result.crossOrigin = null;

      return result;
    };
    config.loader = vegaLoader;

    const vegaLogger = logger(Warn);

    vegaLogger.warn = this.onWarn.bind(this);
    vegaLogger.error = this.onError.bind(this);

    config.logger = vegaLogger;

    return config;
  }

  onError() {
    const error = Utils.formatErrorToStr(...arguments);
    this._addMessage('err', error);
    this._parser.searchAPI.inspectorAdapters?.vega.setError(error);
  }

  onWarn() {
    if (this._renderMode !== 'view' && (!this._parser || !this._parser.hideWarnings)) {
      this._addMessage('warn', Utils.formatWarningToStr(...arguments));
    }
  }

  _addMessage(type, text) {
    if (!this._$messages) {
      this._$messages = $(`<ul class="vgaVis__messages">`).appendTo(this._$parentEl);
    }
    const isMessageAlreadyDisplayed = this._$messages
      .find(`pre.vgaVis__messageCode`)
      .filter((index, element) => element.textContent === text).length;
    if (!isMessageAlreadyDisplayed) {
      this._$messages.append(
        $(`<li class="vgaVis__message vgaVis__message--${type}">`).append(
          $(`<pre class="vgaVis__messageCode">`).text(text)
        )
      );
    }
  }

  async resize(dimensions) {
    if (this._parser.useResize && this._view) {
      this.updateVegaSize(this._view, dimensions);
      await this._view.runAsync();

      // The derived class should create this method
      this.onViewContainerResize?.();
    }
  }

  updateVegaSize(view, dimensions) {
    const width = Math.floor(Math.max(0, dimensions?.width ?? this._$container.width()));
    const height = Math.floor(Math.max(0, dimensions?.height ?? this._$container.height()));

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

      const state = this._vegaStateRestorer.restore();

      if (state) {
        return view.setState(state);
      } else {
        return view.runAsync();
      }
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
        throw new Error(
          i18n.translate(
            'visTypeVega.vegaParser.baseView.functionIsNotDefinedForGraphErrorMessage',
            {
              defaultMessage: '{funcName} is not defined for this graph',
              values: { funcName: `${funcName}()` },
            }
          )
        );
      }
      await this[handlerFunc](...args);
    } catch (err) {
      this.onError(err);
    }
  }

  /**
   * @param {object} query Elastic Query DSL snippet, as used in the query DSL editor
   * @param {string} [index] as defined in Kibana, or default if missing
   * @param {string} Elastic Query DSL's Custom label for kibanaAddFilter, as used in '+ Add Filter'
   */
  async addFilterHandler(query, index, alias) {
    const indexId = await this.findIndex(index);
    const filter = buildQueryFilter(query, indexId, alias);

    this._fireEvent({ name: 'applyFilter', data: { filters: [filter] } });
  }

  /**
   * @param {object} query Elastic Query DSL snippet, as used in the query DSL editor
   * @param {string} [index] as defined in Kibana, or default if missing
   */
  async removeFilterHandler(query, index) {
    const indexId = await this.findIndex(index);
    const filterToRemove = buildQueryFilter(query, indexId);

    const currentFilters = this._filterManager.getFilters();
    const existingFilter = currentFilters.find((filter) => compareFilters(filter, filterToRemove));

    if (!existingFilter) return;

    try {
      this._filterManager.removeFilter(existingFilter);
    } catch (err) {
      this.onError(err);
    }
  }

  removeAllFiltersHandler() {
    this._filterManager.removeAll();
  }

  /**
   * Update dashboard time filter to the new values
   * @param {number|string|Date} start
   * @param {number|string|Date} end
   */
  setTimeFilterHandler(start, end) {
    const { from, to, mode } = VegaBaseView._parseTimeRange(start, end);

    this._fireEvent({
      name: 'applyFilter',
      data: {
        timeFieldName: '*',
        filters: [
          {
            query: {
              range: {
                '*': {
                  mode,
                  gte: from,
                  lte: to,
                },
              },
            },
          },
        ],
      },
    });
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
        throw new Error(
          i18n.translate('visTypeVega.vegaParser.baseView.timeValuesTypeErrorMessage', {
            defaultMessage:
              'Error setting time filter: both time values must be either relative or absolute dates. {start}, {end}',
            values: {
              start: `start=${JSON.stringify(start)}`,
              end: `end=${JSON.stringify(end)}`,
            },
          })
        );
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
   * Set global debug variable to simplify vega debugging in console. Show info message first time
   */
  setDebugValues(view, spec, vlspec) {
    this._parser.searchAPI.inspectorAdapters?.vega.bindInspectValues({
      view,
      spec: vlspec || spec,
    });

    if (window) {
      if (window.VEGA_DEBUG === undefined && console) {
        console.log('%cWelcome to Kibana Vega Plugin!', 'font-size: 16px; font-weight: bold;');
        console.log(
          'You can access the Vega view with VEGA_DEBUG. ' +
            'Learn more at https://vega.github.io/vega/docs/api/debugging/.'
        );
      }
      const debugObj = {};
      window.VEGA_DEBUG = debugObj;
      window.VEGA_DEBUG.VEGA_VERSION = vegaVersion;
      window.VEGA_DEBUG.VEGA_LITE_VERSION = vegaLiteVersion;
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
      this._ongoingDestroy = Promise.all(this._destroyHandlers.map((v) => v()));
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
