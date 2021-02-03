/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EventEmitter } from 'events';

export class KibanaMapLayer extends EventEmitter {
  constructor() {
    super();
    this._leafletLayer = null;
  }

  async getBounds() {
    return this._leafletLayer.getBounds();
  }

  addToLeafletMap(leafletMap) {
    this._leafletLayer.addTo(leafletMap);
  }

  removeFromLeafletMap(leafletMap) {
    leafletMap.removeLayer(this._leafletLayer);
  }

  appendLegendContents() {}

  updateExtent() {}

  movePointer() {}

  getAttributions() {
    return this._attribution;
  }
}
