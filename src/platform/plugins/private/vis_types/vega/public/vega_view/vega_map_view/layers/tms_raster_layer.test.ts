/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initTmsRasterLayer } from './tms_raster_layer';

type InitTmsRasterLayerParams = Parameters<typeof initTmsRasterLayer>[0];

type IdType = InitTmsRasterLayerParams['id'];
type MapType = InitTmsRasterLayerParams['map'];
type ContextType = InitTmsRasterLayerParams['context'];

describe('vega_map_view/tms_raster_layer', () => {
  let id: IdType;
  let map: MapType;
  let context: ContextType;

  beforeEach(() => {
    id = 'foo_tms_layer_id';
    map = {
      addSource: jest.fn(),
      addLayer: jest.fn(),
    } as unknown as MapType;
    context = {
      tiles: ['http://some.tile.com/map/{z}/{x}/{y}.jpg'],
      maxZoom: 10,
      minZoom: 2,
      tileSize: 512,
    };
  });

  test('should register a new layer', () => {
    initTmsRasterLayer({ id, map, context });

    expect(map.addLayer).toHaveBeenCalledWith({
      id: 'foo_tms_layer_id',
      maxzoom: 10,
      minzoom: 2,
      source: 'foo_tms_layer_id',
      type: 'raster',
    });

    expect(map.addSource).toHaveBeenCalledWith('foo_tms_layer_id', {
      scheme: 'xyz',
      tileSize: 512,
      tiles: ['http://some.tile.com/map/{z}/{x}/{y}.jpg'],
      type: 'raster',
    });
  });
});
