import L from 'leaflet';
import 'leaflet-vega';
import * as vega from 'vega';
import { VegaBaseView } from './vega_base_view';

export class VegaMapView extends VegaBaseView {

  async _initViewCustomizations() {
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

    VegaBaseView.setDebugValues(vegaLayer._view, vegaLayer._spec);

    this._addDestroyHandler(() => {
      map.removeLayer(vegaLayer);
      if (baseLayer) map.removeLayer(baseLayer);
      map.remove();
    });
  }

}
