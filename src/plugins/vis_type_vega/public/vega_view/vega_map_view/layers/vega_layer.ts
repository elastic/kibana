/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Map, CustomLayerInterface } from 'mapbox-gl';
import type { View } from 'vega';
import type { LayerParameters } from './types';

export interface VegaLayerContext {
  vegaView: View;
  updateVegaView: (map: Map, view: View) => void;
}

export function initVegaLayer({
  id,
  map: mapInstance,
  context: { vegaView, updateVegaView },
}: LayerParameters<VegaLayerContext>) {
  const vegaLayer: CustomLayerInterface = {
    id,
    type: 'custom',
    onAdd(map: Map) {
      const mapContainer = map.getCanvasContainer();
      const mapCanvas = map.getCanvas();
      const vegaContainer = document.createElement('div');

      vegaContainer.style.position = 'absolute';
      vegaContainer.style.top = '0px';
      vegaContainer.style.width = mapCanvas.style.width;
      vegaContainer.style.height = mapCanvas.style.height;

      mapContainer.appendChild(vegaContainer);
      vegaView.initialize(vegaContainer);
    },
    render() {
      updateVegaView(mapInstance, vegaView);
    },
  };

  mapInstance.addLayer(vegaLayer);
}
