import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-vega';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { ViewUtils } from './index';

//https://github.com/elastic/kibana/issues/13327
vega.scheme('elastic',
  ['#00B3A4', '#3185FC', '#DB1374', '#490092', '#FEB6DB', '#F98510', '#E6C220', '#BFA180', '#920000', '#461A0A']
);

// FIXME: handle runtime errors by overwriting  vega.logging.error ...
export class VegaView {
  constructor(vegaConfig, parentEl, vegaParser, serviceSettings) {
    this._vegaConfig = vegaConfig;
    this._$parentEl = $(parentEl);
    this._serviceSettings = serviceSettings;
    this._parser = vegaParser;
    this._view = null;
    this._vegaViewConfig = null;
    this._$messages = null;
    this._destroyHandlers = [];
    this._initialized = false;
  }

  async init() {
    // safety
    if (this._initialized) throw new Error();
    this._initialized = true;

    try {
      this._$parentEl.empty()
        .addClass('vega-main')
        .css('flex-direction', this._parser.containerDir);

      if (this._parser.error) {
        this._addMessage('err', this._parser.error);
        return;
      }

      this._$container = $('<div class="vega-view-container">')
        .appendTo(this._$parentEl);
      this._$controls = $('<div class="vega-controls-container">')
        .css('flex-direction', this._parser.controlsDir)
        .appendTo(this._$parentEl);

      // bypass the onWarn warning checks - in some cases warnings may still need to be shown despite being off
      for (const warn of this._parser.warnings) {
        this._addMessage('warn', warn);
      }

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
        renderer: 'canvas',
      };
      if (!this._vegaConfig.enableExternalUrls) {
        // Override URL loader to disable all URL-based requests
        const loader = vega.loader();
        loader.load = () => {
          throw new Error('External URLs have been disabled in kibana.yml');
        };
        this._vegaViewConfig.loader = loader;
      }

      if (this._parser.useMap) {
        await this._initLeafletVega();
      } else {
        await this._initRawVega();
      }
    } catch (err) {
      this.onError(err);
    }
  }

  onError() {
    this._addMessage('err', ViewUtils.formatErrorToStr(...arguments));
  }

  onWarn() {
    if (!this._parser || !this._parser.hideWarnings) {
      this._addMessage('warn', ViewUtils.formatWarningToStr(...arguments));
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
    // FIXME: for some reason the object is slightly scrollable without this
    const heightExtraPadding = 6;
    const width = Math.max(0, this._$container.width() - this._parser.paddingWidth);
    const height = Math.max(0, this._$container.height() - this._parser.paddingHeight) - heightExtraPadding;
    if (view.width() !== width || view.height() !== height) {
      view.width(width).height(height);
      return true;
    }
    return false;
  }

  async _initRawVega() {
    // In some cases, Vega may be initialized twice... TBD
    if (!this._$container) return;

    const view = new vega.View(vega.parse(this._parser.spec), this._vegaViewConfig);
    VegaView.setDebugValues(view, this._parser.spec, this._parser.vlspec);

    view.warn = this.onWarn.bind(this);
    view.error = this.onError.bind(this);
    if (this._parser.useResize) this.updateVegaSize(view);
    view.initialize(this._$container.get(0), this._$controls.get(0));

    if (this._parser.useHover) view.hover();

    this._addDestroyHandler(() => {
      this._view = null;
      view.finalize();
    });

    await view.runAsync();
    this._view = view;
  }

  async _initLeafletVega() {
    const mapConfig = this._parser.mapConfig;
    const useDefaultMap = mapConfig.mapStyle !== false;

    let limits;
    let url;
    let baseLayer;

    if (useDefaultMap) {
      const tmsService = await this._serviceSettings.getTMSService();
      // FIXME: In some cases, Vega may be initialized twice, e.g. after awaiting... TBD
      if (!this._$container) return;

      url = tmsService.getUrl();
      limits = tmsService.getTMSOptions();
    } else {
      limits = { minZoom: 0, maxZoom: 25 };
    }

    const validate = (name, value, dflt, min, max) => {
      if (value === undefined) {
        value = dflt;
      } else if (value < min) {
        this.onWarn(`Resetting ${name} to ${min}`);
        value = min;
      } else if (value > max) {
        this.onWarn(`Resetting ${name} to ${max}`);
        value = max;
      }
      return value;
    };

    let minZoom = validate('minZoom', mapConfig.minZoom, limits.minZoom, limits.minZoom, limits.maxZoom);
    let maxZoom = validate('maxZoom', mapConfig.maxZoom, limits.maxZoom, limits.minZoom, limits.maxZoom);
    if (minZoom > maxZoom) {
      this.onWarn('minZoom and maxZoom have been swapped');
      [minZoom, maxZoom] = [maxZoom, minZoom];
    }
    const zoom = validate('zoom', mapConfig.zoom, 2, minZoom, maxZoom);

    // let maxBounds = null;
    // if (mapConfig.maxBounds) {
    //   const b = mapConfig.maxBounds;
    //   maxBounds = L.latLngBounds(L.latLng(b[1], b[0]), L.latLng(b[3], b[2]));
    // }

    const map = L.map(this._$container.get(0), {
      minZoom,
      maxZoom,
      center: [mapConfig.latitude, mapConfig.longitude],
      zoom,
      zoomControl: mapConfig.zoomControl,
      attributionControl: useDefaultMap,
      // TODO: test and enable
      // maxBounds
    });

    if (useDefaultMap) {
      map.attributionControl.setPrefix('');

      baseLayer = L
        .tileLayer(url, {
          minZoom: limits.minZoom,
          maxZoom: limits.maxZoom,
          subdomains: limits.subdomains || [],
          attribution: limits.attribution
        })
        .addTo(map);
    }

    const vegaLayer = L
      .vega(this._parser.spec, {
        vega,
        bindingsContainer: this._$controls.get(0),
        delayRepaint: mapConfig.delayRepaint,
        viewConfig: this._vegaViewConfig,
        onWarning: this.onWarn.bind(this),
        onError: this.onError.bind(this),
      })
      .addTo(map);

    VegaView.setDebugValues(vegaLayer._view, vegaLayer._spec);

    this._addDestroyHandler(() => {
      map.removeLayer(vegaLayer);
      if (baseLayer) map.removeLayer(baseLayer);
      map.remove();
    });
  }

  /**
   * Set global debug variable to simplify vega debugging in console. Show info message first time
   */
  static setDebugValues(view, spec, vlspec) {
    if (window) {
      if (window.VEGA_DEBUG === undefined && console) {
        console.log('%cWelcome to Kibana Vega Plugin!', 'font-size: 16px; font-weight: bold;');
        console.log('You can access the Vega view with VEGA_DEBUG. Learn more at https://vega.github.io/vega/docs/api/debugging/.');
      }

      window.VEGA_DEBUG = window.VEGA_DEBUG || {};
      window.VEGA_DEBUG.VEGA_VERSION = vega.version;
      window.VEGA_DEBUG.VEGA_LITE_VERSION = vegaLite.version;
      window.VEGA_DEBUG.view = view;
      window.VEGA_DEBUG.vega_spec = spec;
      window.VEGA_DEBUG.vegalite_spec = vlspec;
    }
  }

  destroy() {
    // properly handle multiple destroy() calls by converting this._destroyHandlers
    // from an array into a promise, while handlers are being disposed
    if (this._destroyHandlers) {
      if (this._destroyHandlers.then) {
        return this._destroyHandlers;
      } else {
        this._destroyHandlers = Promise.all(this._destroyHandlers.map(v => v()));
        return this._destroyHandlers.then(() => this._destroyHandlers = null);
      }
    }
  }

  _addDestroyHandler(handler) {
    if (this._destroyHandlers) {
      this._destroyHandlers.push(handler);
    } else {
      handler(); // When adding a handled after disposing, dispose it right away
    }
  }
}
