/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaMapLayer } from '../../../maps_legacy/public';

export class VegaMapLayer extends KibanaMapLayer {
  constructor(spec, options, leaflet) {
    super();

    // Used by super.getAttributions()
    this._attribution = options.attribution;
    delete options.attribution;
    this._leafletLayer = leaflet.vega(spec, options);
  }

  getVegaView() {
    return this._leafletLayer._view;
  }

  getVegaSpec() {
    return this._leafletLayer._spec;
  }
}
