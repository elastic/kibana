/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import fs from 'fs';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { convertMapboxVectorTileToJson } from './convert_mapbox_vector_tile_to_json';

describe('Convert mapbox vector tile to json', () => {
  let vectorTile: VectorTile;

  beforeAll(() => {
    // Query sample "get kibana_sample_data_logs/_mvt/geo.coordinates/8/47/98"
    const response = fs.readFileSync(
      'src/plugins/console/public/application/containers/editor/legacy/console_editor/mapbox_vector_tile/response.pbf'
    );
    vectorTile = new VectorTile(new Protobuf(response));
  });

  it('function should convert vectorTile to string', () => {
    expect(() => {
      const json = convertMapboxVectorTileToJson(vectorTile);
      JSON.parse(json);
    }).not.toThrow();
  });

  it('response should have [meta, aggs, hits] layers', () => {
    const processed = JSON.parse(convertMapboxVectorTileToJson(vectorTile));

    expect(processed).toHaveProperty('meta');
    expect(processed).toHaveProperty('aggs');
    expect(processed).toHaveProperty('hits');
  });
});
