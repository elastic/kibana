import L from 'leaflet';
import 'leaflet-vega';
import { KibanaMapLayer } from 'ui/vis/map/kibana_map_layer';

export class VegaMapLayer extends KibanaMapLayer {

  constructor(spec, options) {
    super();

    // Used by super.getAttributions()
    this._attribution = options.attribution;
    delete options.attribution;

    this._leafletLayer = L.vega(spec, options);
  }

  getVegaView() {
    return this._leafletLayer._view;
  }

  getVegaSpec() {
    return this._leafletLayer._spec;
  }
}
