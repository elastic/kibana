/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initVegaLayer } from './vega_layer';
import type { View } from 'vega';

type InitVegaLayerParams = Parameters<typeof initVegaLayer>[0];

type IdType = InitVegaLayerParams['id'];
type MapType = InitVegaLayerParams['map'];
type ContextType = InitVegaLayerParams['context'];

describe('vega_map_view/tms_raster_layer', () => {
  let id: IdType;
  let map: MapType;
  let context: ContextType;

  beforeEach(() => {
    id = 'foo_vega_layer_id';
    map = {
      getCanvasContainer: () => document.createElement('div'),
      getCanvas: () => ({
        style: {
          width: 100,
          height: 100,
        },
      }),
      addLayer: jest.fn(),
    } as unknown as MapType;
    context = {
      vegaView: {
        initialize: jest.fn(),
      } as unknown as View,
      vegaControls: 'element',
      updateVegaView: jest.fn(),
    };
  });

  test('should register a new custom layer', () => {
    initVegaLayer({ id, map, context });

    const calledWith = (map.addLayer as jest.MockedFunction<any>).mock.calls[0][0];
    expect(calledWith).toHaveProperty('id', 'foo_vega_layer_id');
    expect(calledWith).toHaveProperty('type', 'custom');
  });

  test('should initialize vega container on "onAdd" hook', () => {
    initVegaLayer({ id, map, context });
    const { onAdd } = (map.addLayer as jest.MockedFunction<any>).mock.calls[0][0];

    onAdd(map);
    expect(context.vegaView.initialize).toHaveBeenCalled();
  });

  test('should update vega view on "render" hook', () => {
    initVegaLayer({ id, map, context });
    const { render } = (map.addLayer as jest.MockedFunction<any>).mock.calls[0][0];

    expect(context.updateVegaView).not.toHaveBeenCalled();
    render();
    expect(context.updateVegaView).toHaveBeenCalled();
  });
});
