import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-vega';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';

//https://github.com/elastic/kibana/issues/13327
vega.scheme('elastic',
  ['#00B3A4', '#3185FC', '#DB1374', '#490092', '#FEB6DB', '#F98510', '#E6C220', '#BFA180', '#920000', '#461A0A']
);

// FIXME: handle runtime errors by overrwriting  vega.logging.error ...
export class VegaView {
  constructor(vegaConfig, parentEl, vegaParser, serviceSettings, onError, onWarn) {
    this._onWarn = onWarn;
    this._onError = onError;
    this._parentEl = $(parentEl);
    this._serviceSettings = serviceSettings;
    this._parser = vegaParser;

    if (this._parser.hideWarnings) {
      this._onWarn = () => 0;
    }

    this._parentEl.css('flex-direction', this._parser.containerDir);

    this._view = null;

    this._viewConfig = {
      logLevel: vega.Warn,
      renderer: 'canvas',
    };

    /**
     * ... the loader instance to use for data file loading. A
     * loader object must provide a "load" method for loading files and a
     * "sanitize" method for checking URL/filename validity. Both methods
     * should accept a URI and options hash as arguments, and return a Promise
     * that resolves to the loaded file contents (load) or a hash containing
     * sanitized URI data with the sanitized url assigned to the "href" property
     * (sanitize).
     */
    if (!vegaConfig.enableExternalUrls) {
      const loader = vega.loader();
      loader.load = () => {
        throw new Error('External URLs have been disabled in kibana.yml');
      };
      this._viewConfig.loader = loader;
    }
  }

  async init() {
    this._$container = $('<div class="vega-view-container">').appendTo(this._parentEl);
    this._$controls = $('<div class="vega-controls-container">')
      .css('flex-direction', this._parser.controlsDir)
      .appendTo(this._parentEl);

    this._addDestroyHandler(() => {
      this._$container.remove();
      this._$container = null;
      this._$controls.remove();
      this._$controls = null;
    });

    try {
      if (this._parser.useMap) {
        await this._initLeafletVega();
      } else {
        await this._initRawVega();
      }
    } catch (err) {
      this._onError(err);
    }
  }

  resize() {
    if (this._parser.useResize && this._view && this.updateVegaSize(this._view)) {
      return this._view.runAsync();
    } else {
      return Promise.resolve();
    }
  }

  // BUG: FIXME: if this method is called twice without awaiting, the sceond call will return success right away
  async destroy() {
    if (this._destroyHandlers) {
      const handlers = this._destroyHandlers;
      this._destroyHandlers = null;
      for (const handler of handlers) {
        await handler();
      }
    }
  }

  _destroyHandlers = [];

  _addDestroyHandler(handler) {
    if (this._destroyHandlers) {
      this._destroyHandlers.push(handler);
    } else {
      handler();
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

    const view = new vega.View(vega.parse(this._parser.spec), this._viewConfig);
    VegaView.setDebugValues(view, this._parser.spec, this._parser.vlspec);

    view.warn = this._onWarn;
    view.error = this._onError;
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
    const specParams = this._parser;
    const useDefaultMap = specParams.mapStyle !== false;

    let limits;
    let url;
    let baseLayer;

    if (useDefaultMap) {
      const tmsService = await this._serviceSettings.getTMSService();
      url = tmsService.getUrl();
      limits = tmsService.getTMSOptions();
    } else {
      limits = { minZoom: 0, maxZoom: 25 };
    }

    // In some cases, Vega may be initialized twice, e.g. after awaiting... TBD
    if (!this._$container) return;

    const validate = (name, value, dflt, min, max) => {
      if (value === undefined) {
        value = dflt;
      } else if (value < min) {
        this._onWarn(`Reseting ${name} to ${min}`);
        value = min;
      } else if (value > max) {
        this._onWarn(`Reseting ${name} to ${max}`);
        value = max;
      }
      return value;
    };

    let minZoom = validate('minZoom', specParams.minZoom, limits.minZoom, limits.minZoom, limits.maxZoom);
    let maxZoom = validate('maxZoom', specParams.maxZoom, limits.maxZoom, limits.minZoom, limits.maxZoom);
    if (minZoom > maxZoom) {
      this._onWarn('minZoom and maxZoom have been swapped');
      [minZoom, maxZoom] = [maxZoom, minZoom];
    }
    const zoom = validate('zoom', specParams.zoom, 2, minZoom, maxZoom);

    // let maxBounds = null;
    // if (specParams.maxBounds) {
    //   const b = specParams.maxBounds;
    //   maxBounds = L.latLngBounds(L.latLng(b[1], b[0]), L.latLng(b[3], b[2]));
    // }

    const map = L.map(this._$container.get(0), {
      minZoom,
      maxZoom,
      center: [specParams.latitude, specParams.longitude],
      zoom,
      zoomControl: specParams.zoomControl,
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
      .vega(specParams.spec, {
        vega,
        bindingsContainer: this._$controls.get(0),
        delayRepaint: specParams.delayRepaint,
        viewConfig: this._viewConfig,
        onWarning: this._onWarn,
        onError: this._onError
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
      window.VEGA_DEBUG.vegaspec = spec;
      window.VEGA_DEBUG.vegalitespec = vlspec;
    }
  }
}
