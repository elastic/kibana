/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayerParameters } from './types';

interface TMSRasterLayerContext {
  tiles: string[];
  maxZoom: number;
  minZoom: number;
  tileSize: number;
}

export const initTmsRasterLayer = ({
  id,
  map,
  context: { tiles, maxZoom, minZoom, tileSize },
}: LayerParameters<TMSRasterLayerContext>) => {
  map.addSource(id, {
    type: 'raster',
    tiles,
    tileSize,
    scheme: 'xyz',
  });

  map.addLayer({
    id,
    type: 'raster',
    source: id,
    maxzoom: maxZoom,
    minzoom: minZoom,
  });
};
