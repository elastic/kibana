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
import { VEGA_FUNCTION_NAMES } from '@kbn/vega-sandbox';

// Vega's extension functions are global. When called, we forward the call to the instance's
// parent as a filter action; the parent validates it, so the view never builds filters itself.
for (const funcName of VEGA_FUNCTION_NAMES) {
  if (!expressionFunction(funcName)) {
    expressionFunction(funcName, function handlerFwd(...args) {
      const view = this.context.dataflow;
      view.runAfter(() => view._kibanaView.emitFilterAction(funcName, args));
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
    this._descriptor = opts.descriptor;
    this._trustedDataUrls = new Set(opts.descriptor.trustedDataUrls);
    this._onError = opts.onError;
    this._onViewCreated = opts.onViewCreated;
    this._serviceSettings = opts.serviceSettings;
    this._onFilterAction = opts.onFilterAction;
    this._view = null;
    this._vegaViewConfig = null;
    this._messages = null;
    this._destroyHandlers = [];
    this._initialized = false;
    this._externalUrl = opts.externalUrl;
    this._enableExternalUrls = getEnableExternalUrls();
    this._showWarnings = opts.showWarnings;
    this._vegaStateRestorer = opts.vegaStateRestorer;
  }

  async init() {
    if (this._initialized) throw new Error(); // safety
    this._initialized = true;

    try {
      if (this._descriptor.useResize) {
        this._parentEl.classList.add('vgaVis--autoresize');
      } else {
        this._parentEl.classList.remove('vgaVis--autoresize');
      }
      this._parentEl.replaceChildren();
      this._parentEl.classList.add('vgaVis');
      this._parentEl.style.flexDirection = this._descriptor.containerDir;

      // bypass the onWarn warning checks - in some cases warnings may still need to be shown despite being disabled
      for (const warn of this._descriptor.warnings) {
        this._addMessage('warn', warn);
      }

      if (this._descriptor.error) {
        this.onError(this._descriptor.error);
        return;
      }

      this._container = document.createElement('div');
      this._container.classList.add('vgaVis__view');
      this._parentEl.append(this._container);

      this._controls = document.createElement('div');
      this._controls.classList.add(
        `vgaVis__controls`,
        `vgaVis__controls--${this._descriptor.controlsDir}`
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
      renderer: this._descriptor.renderer,
    };

    // Override URL sanitizer to prevent external data loading (if disabled)
    const vegaLoader = loader();
    const originalSanitize = vegaLoader.sanitize.bind(vegaLoader);
    vegaLoader.sanitize = async (uri, options) => {
      // URLs Kibana resolved on the spec's behalf (e.g. EMS files) skip the check.
      const isTrustedUrl = this._trustedDataUrls.has(uri);
      if (!isTrustedUrl && !this._externalUrl.isInternalUrl(uri)) {
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

    const vegaSpec = this._descriptor.isVegaLite ? this._descriptor.vlspec : this._descriptor.spec;
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
    this._onError(error);
  }

  onWarn(...args) {
    if (this._showWarnings && (!this._descriptor || !this._descriptor.hideWarnings)) {
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
    ].some((element) => element.textContent === text);
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
    if (this._descriptor.useResize && this._view) {
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

      if (this._descriptor.tooltips) {
        // position and padding can be specified with
        // {config:{kibana:{tooltips: {position: 'top', padding: 15 } }}}
        const tthandler = new TooltipHandler(this._container, view, this._descriptor.tooltips);

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
   * Forwards a filter action raised by the spec to the parent, displaying any error it reports.
   * @param {string} fn
   * @param {unknown[]} args
   * @returns {Promise<void>}
   */
  async emitFilterAction(fn, args) {
    try {
      await this._onFilterAction({ fn, args });
    } catch (err) {
      this.onError(err);
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
