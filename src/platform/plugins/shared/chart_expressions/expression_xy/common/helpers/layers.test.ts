/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { XYExtendedLayerConfigResult } from '../types';
import { generateLayerId, appendLayerIds, getDataLayers } from './layers';

describe('#generateLayerId', () => {
  it('should return the combination of keyword and index', () => {
    const key = 'some-key';
    const index = 10;
    const id = generateLayerId(key, index);
    expect(id).toBe(`${key}-${index}`);
  });
});

describe('#appendLayerIds', () => {
  it('should add layerId to each layer', () => {
    const layers = [{ name: 'someName' }, { name: 'someName2' }, { name: 'someName3' }];
    const keyword = 'keyword';
    const expectedLayerIds = [
      { ...layers[0], layerId: `${keyword}-0` },
      { ...layers[1], layerId: `${keyword}-1` },
      { ...layers[2], layerId: `${keyword}-2` },
    ];

    const layersWithIds = appendLayerIds(layers, keyword);
    expect(layersWithIds).toStrictEqual(expectedLayerIds);
  });

  it('should filter out undefined layers', () => {
    const layers = [undefined, undefined, undefined];
    const result = appendLayerIds(layers, 'some-key');
    expect(result).toStrictEqual([]);

    const layers2 = [{ name: 'someName' }, undefined, { name: 'someName3' }];
    const keyword = 'keyword';
    const expectedLayerIds = [
      { ...layers2[0], layerId: `${keyword}-0` },
      { ...layers2[2], layerId: `${keyword}-1` },
    ];

    const layersWithIds = appendLayerIds(layers2, keyword);
    expect(layersWithIds).toStrictEqual(expectedLayerIds);
  });
});

describe('#getDataLayers', () => {
  it('should return only data layers', () => {
    const layers: XYExtendedLayerConfigResult[] = [
      {
        type: 'extendedDataLayer',
        layerType: 'data',
        accessors: ['y'],
        seriesType: 'bar',
        xScaleType: 'time',
        isHistogram: false,
        isHorizontal: false,
        isPercentage: false,
        isStacked: false,
        table: { rows: [], columns: [], type: 'datatable' },
        palette: { type: 'system_palette', name: 'system' },
      },
      {
        type: 'referenceLineLayer',
        layerType: 'referenceLine',
        accessors: ['y'],
        table: { rows: [], columns: [], type: 'datatable' },
      },
    ];

    expect(getDataLayers(layers)).toStrictEqual([layers[0]]);
  });
});
