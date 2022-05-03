/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateLayerId, appendLayerIds } from './layers';

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
