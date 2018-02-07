import $ from 'jquery';
import * as vega from 'vega-lib';
import * as vegaLite from 'vega-lite';
import { Utils } from '../data_model/utils';

//https://github.com/elastic/kibana/issues/13327
vega.scheme('elastic',
  ['#00B3A4', '#3185FC', '#DB1374', '#490092', '#FEB6DB', '#F98510', '#E6C220', '#BFA180', '#920000', '#461A0A']
);

export class VegaBaseView {
  constructor(vegaConfig, editorMode, parentEl, vegaParser, serviceSettings) {
    this._vegaConfig = vegaConfig;
    this._editorMode = editorMode;
    this._$parentEl = $(parentEl);
    this._parser = vegaParser;
    this._serviceSettings = serviceSettings;
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
        this._$container.remove();
        this._$container = null;
        this._$controls.remove();
        this._$controls = null;
        if (this._$messages) {
          this._$messages.remove();
          this._$messages = null;
        }
      });

      this._vegaViewConfig = {
        logLevel: vega.Warn,
        renderer: this._parser.renderer,
      };
      if (!this._vegaConfig.enableExternalUrls) {
        // Override URL loader and sanitizer to disable all URL-based requests
        const errorFunc = () => {
          throw new Error('External URLs are not enabled. Add  "vega": {"enableExternalUrls": true}  to kibana.yml');
        };
        const loader = vega.loader();
        loader.load = errorFunc;
        loader.sanitize = errorFunc;
        this._vegaViewConfig.loader = loader;
      }

      // The derived class should create this method
      await this._initViewCustomizations();
    } catch (err) {
      this.onError(err);
    }
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

  /**
   * Set global debug variable to simplify vega debugging in console. Show info message first time
   */
  setDebugValues(view, spec, vlspec) {
    if (!this._editorMode) {
      // VEGA_DEBUG should only be enabled in the editor mode
      return;
    }

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
