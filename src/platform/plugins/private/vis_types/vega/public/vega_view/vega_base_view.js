/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loader, logger, Warn, expressionFunction } from 'vega';
import { expressionInterpreter } from 'vega-interpreter';
import { Utils } from '../data_model/utils';
import { i18n } from '@kbn/i18n';
import { TooltipHandler } from './vega_tooltip';

import { getEnableExternalUrls } from '../services';
import { VEGA_FUNCTION_NAMES } from './vega_filter_action_handler';
export { bypassExternalUrlCheck } from '../data_model/external_url_check_bypass';

// Vega's extension functions are global. When called,
// we forward execution to the instance-specific handler.
for (const funcName of VEGA_FUNCTION_NAMES) {
  if (!expressionFunction(funcName)) {
    expressionFunction(funcName, function handlerFwd(...args) {
      const view = this.context.dataflow;
      view.runAfter(() => view._kibanaView.vegaFunctionsHandler(funcName, ...args));
    });
  }
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
    this._parentEl = opts.parentEl;
    this._parser = opts.vegaParser;
    this._serviceSettings = opts.serviceSettings;
    this._view = null;
    this._vegaViewConfig = null;
    this._messages = null;
    this._destroyHandlers = [];
    this._initialized = false;
    this._externalUrl = opts.externalUrl;
    this._enableExternalUrls = getEnableExternalUrls();
    this._renderMode = opts.renderMode;
    this._vegaStateRestorer = opts.vegaStateRestorer;
    this._bypassExternalUrlCheckUrls = new Set(opts.bypassExternalUrlCheckUrls || []);
    this._onError = opts.onError;
    this._onSetDebugValues = opts.onSetDebugValues;
    this._onVegaFunction = opts.onVegaFunction;
  }

  async init() {
    if (this._initialized) throw new Error(); // safety
    this._initialized = true;

    try {
      if (this._parser.useResize) {
        this._parentEl.classList.add('vgaVis--autoresize');
      } else {
        this._parentEl.classList.remove('vgaVis--autoresize');
      }
      this._parentEl.replaceChildren();
      this._parentEl.classList.add('vgaVis');
      this._parentEl.style.flexDirection = this._parser.containerDir;

      // bypass the onWarn warning checks - in some cases warnings may still need to be shown despite being disabled
      for (const warn of this._parser.warnings) {
        this._addMessage('warn', warn);
      }

      if (this._parser.error) {
        this.onError(this._parser.error);
        return;
      }

      this._container = document.createElement('div');
      this._container.classList.add('vgaVis__view');
      this._parentEl.append(this._container);

      this._controls = document.createElement('div');
      this._controls.classList.add(
        `vgaVis__controls`,
        `vgaVis__controls--${this._parser.controlsDir}`
      );
      this._parentEl.append(this._controls);

      this._addDestroyHandler(() => {
        if (this._container) {
          this._container.remove();
          this._container = null;
        }
        if (this._controls) {
          this._controls.remove();
          this._controls = null;
        }
        if (this._messages) {
          this._messages.remove();
          this._messages = null;
        }
        if (this._view) {
          const state = this._view.getState();
          if (state) {
            this._vegaStateRestorer.save(state);
          }
          this._view.finalize();
        }
        this._view = null;
        this._vegaViewConfig = null;
      });

      this._vegaViewConfig = this.createViewConfig();

      // The derived class should create this method
      await this._initViewCustomizations();
    } catch (err) {
      this.onError(err);
    }
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
      if (this._bypassExternalUrlCheckUrls.has(uri)) {
        // EMS file URLs are resolved parent-side and added to this per-render allowlist.
      } else if (!this._externalUrl.isInternalUrl(uri)) {
        if (!this._enableExternalUrls) {
          this.handleExternalUrlError(getExternalUrlsAreNotEnabledError());
        } else if (!this._externalUrl.validateUrl(uri)) {
          this.handleExternalUrlError(getExternalUrlServiceError(uri));
        }
      }
      const result = await originalSanitize(uri, options);
      // This will allow Vega users to load images from any domain.
      result.crossOrigin = null;

      return result;
    };

    const vegaSpec = this._parser.isVegaLite ? this._parser.vlspec : this._parser.spec;
    const usermetaLoaderOptions = vegaSpec.usermeta?.embedOptions?.loader;
    const ALLOWED_LOADER_OPTIONS = ['target', 'rel'];
    const sanitizedLoaderOptions = {};
    for (const key of ALLOWED_LOADER_OPTIONS) {
      if (usermetaLoaderOptions?.[key] != null) {
        sanitizedLoaderOptions[key] = String(usermetaLoaderOptions[key]);
      }
    }
    vegaLoader.options = sanitizedLoaderOptions;

    config.loader = vegaLoader;

    const vegaLogger = logger(Warn);

    vegaLogger.warn = (...args) => {
      this.onWarn(...args);
      return vegaLogger;
    };
    vegaLogger.error = (...args) => {
      this.onError(...args);
      return vegaLogger;
    };

    config.logger = vegaLogger;

    return config;
  }

  onError(...args) {
    const error = Utils.formatErrorToStr(...args);
    this._addMessage('err', error);
    this._onError?.(error);
  }

  onWarn(...args) {
    if (this._renderMode !== 'view' && (!this._parser || !this._parser.hideWarnings)) {
      this._addMessage('warn', Utils.formatWarningToStr(...args));
    }
  }

  _addMessage(type, text) {
    if (!this._messages) {
      this._messages = document.createElement('ul');
      this._messages.classList.add('vgaVis__messages');
      this._parentEl.append(this._messages);
    }
    const isMessageAlreadyDisplayed = [
      ...this._messages.querySelectorAll(`:scope pre.vgaVis__messageCode`),
    ].filter((index, element) => element.textContent === text).length;
    if (!isMessageAlreadyDisplayed) {
      const messageCodeEl = document.createElement('pre');
      messageCodeEl.classList.add('vgaVis__messageCode');
      messageCodeEl.textContent = text;

      const messageItemEl = document.createElement('li');
      messageItemEl.classList.add(`vgaVis__message`, `vgaVis__message--${type}`);
      messageItemEl.append(messageCodeEl);

      this._messages.append(messageItemEl);
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
    const width = Math.floor(Math.max(0, dimensions?.width ?? this._container.clientWidth - 1));
    const height = Math.floor(Math.max(0, dimensions?.height ?? this._container.clientHeight - 1));

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
        const tthandler = new TooltipHandler(this._container, view, this._parser.tooltips);

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
      await this._onVegaFunction?.({ fn: funcName, args });
    } catch (err) {
      this.onError(err);
    }
  }

  /**
   * Set global debug variable to simplify vega debugging in console. Show info message first time
   */
  setDebugValues(view, spec, vlspec) {
    this._onSetDebugValues?.({
      view,
      spec: vlspec || spec,
    });
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
