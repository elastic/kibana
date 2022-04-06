/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { convertMapboxVectorTileToJson } from './convert_mapbox_vector_tile_to_json';

const PATH_TO_PBF = resolve(__dirname, './response.pbf'); // Query sample "GET kibana_sample_data_logs/_mvt/geo.coordinates/8/47/98"

describe('Convert mapbox vector tile to json', () => {
  let vectorTile: VectorTile;

  beforeAll(() => {
    const response = readFileSync(PATH_TO_PBF);
    vectorTile = new VectorTile(new Protobuf(response));
  });

  it('function should convert vectorTile to string', () => {
    expect(() => {
      const json = convertMapboxVectorTileToJson(vectorTile);
      JSON.parse(json);
    }).not.toThrow();
  });

  it('response should have [meta, aggs, hits] layers', () => {
    const vectorTileJson = JSON.parse(convertMapboxVectorTileToJson(vectorTile));

    expect(vectorTileJson).toHaveProperty('meta');
    expect(vectorTileJson).toHaveProperty('aggs');
    expect(vectorTileJson).toHaveProperty('hits');
  });
});
