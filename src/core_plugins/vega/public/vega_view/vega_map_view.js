import * as vega from 'vega-lib';
import { VegaBaseView } from './vega_base_view';
import { KibanaMap } from '../../../tile_map/public/kibana_map';
import { VegaMapLayer } from './vega_map_layer';

export class VegaMapView extends VegaBaseView {

  async _initViewCustomizations() {
    const mapConfig = this._parser.mapConfig;
    let baseMapOpts;
    let minZoom = 0;
    let maxZoom = 25;

    if (mapConfig.mapStyle !== false) {
      const tmsServices = await this._serviceSettings.getTMSServices();
      // In some cases, Vega may be initialized twice, e.g. after awaiting...
      if (!this._$container) return;
      const mapStyle = mapConfig.mapStyle === 'default' ? 'road_map' : mapConfig.mapStyle;
      baseMapOpts = tmsServices.find((s) => s.id === mapStyle);
      if (!baseMapOpts) {
        this.onWarn(`mapStyle ${JSON.stringify(mapStyle)} was not found`);
      } else {
        minZoom = baseMapOpts.minZoom;
        maxZoom = baseMapOpts.maxZoom;
      }
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

    let minZoom2 = validate('minZoom', mapConfig.minZoom, minZoom, minZoom, maxZoom);
    let maxZoom2 = validate('maxZoom', mapConfig.maxZoom, maxZoom, minZoom, maxZoom);
    if (minZoom2 > maxZoom2) {
      this.onWarn('minZoom and maxZoom have been swapped');
      [minZoom2, maxZoom2] = [maxZoom2, minZoom2];
    }
    const zoom = validate('zoom', mapConfig.zoom, 2, minZoom2, maxZoom2);

    // let maxBounds = null;
    // if (mapConfig.maxBounds) {
    //   const b = mapConfig.maxBounds;
    //   maxBounds = L.latLngBounds(L.latLng(b[1], b[0]), L.latLng(b[3], b[2]));
    // }

    this._kibanaMap = new KibanaMap(
      this._$container.get(0),
      {
        zoom,
        center: [mapConfig.latitude, mapConfig.longitude],
        minZoom: minZoom2,
        maxZoom: maxZoom2,
        zoomControl: mapConfig.zoomControl,
        scrollWheelZoom: mapConfig.scrollWheelZoom,
      });

    if (baseMapOpts) {
      this._kibanaMap.setBaseLayer({
        baseLayerType: 'tms',
        options: baseMapOpts
      });
    }

    const vegaMapLayer = new VegaMapLayer(this._parser.spec, {
      vega,
      bindingsContainer: this._$controls.get(0),
      delayRepaint: mapConfig.delayRepaint,
      viewConfig: this._vegaViewConfig,
      onWarning: this.onWarn.bind(this),
      onError: this.onError.bind(this),
    });

    this._kibanaMap.addLayer(vegaMapLayer);

    this.setDebugValues(vegaMapLayer.getVegaView(), vegaMapLayer.getVegaSpec());

    this._addDestroyHandler(() => {
      this._kibanaMap.removeLayer(vegaMapLayer);
      if (baseMapOpts) {
        this._kibanaMap.setBaseLayer(null);
      }
      this._kibanaMap.destroy();
    });
  }

}
