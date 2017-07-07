import { EventEmitter } from 'events';


export class KibanaMapLayer extends EventEmitter {
  constructor() {
    super();
    this._leafletLayer = null;
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }

  addToLeafletMap(leafletMap) {
    this._leafletLayer.addTo(leafletMap);
  }

  removeFromLeafletMap(leafletMap) {
    leafletMap.removeLayer(this._leafletLayer);
  }

  appendLegendContents() {
  }

  updateExtent() {
  }

  movePointer() {
  }
}








