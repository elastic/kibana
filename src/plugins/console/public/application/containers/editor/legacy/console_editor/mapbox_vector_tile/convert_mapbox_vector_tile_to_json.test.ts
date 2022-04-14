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

const PATH_TO_PBF = resolve(__dirname, './response.pbf'); // Query sample "GET kibana_sample_data_logs/_mvt/geo.coordinates/8/23/63"

const MOCK_JSON = JSON.parse(`
{
	"meta": [
		{
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[0,4096],
						[4096,4096],
						[4096,0],
						[0,0],
						[0,4096]
					]
				]
			},
			"properties": {
				"_shards.failed": 0,
				"_shards.skipped": 0,
				"_shards.successful": 1,
				"_shards.total": 1,
				"aggregations._count.avg": 1,
				"aggregations._count.count": 1,
				"aggregations._count.max": 1,
				"aggregations._count.min": 1,
				"aggregations._count.sum": 1,
				"hits.total.relation": "eq",
				"hits.total.value": 1,
				"timed_out": false,
				"took": 1
			}
		}
	],
	"hits": [
		{
			"geometry": {
				"type": "Point",
				"coordinates": [
					3619,
					334
				]
			},
			"properties": {
				"_id": "vFVzI4ABgP1gvXfjt0mI",
				"_index": "kibana_sample_data_logs"
			}
		}
	],
	"aggs": [
		{
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[3616,336],
						[3632,336],
						[3632,320],
						[3616,320],
						[3616,336]
					]
				]
			},
			"properties": {
				"_key": "16/6114/16148",
				"_count": 1
			}
		}
	]
}`);

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
    expect(vectorTileJson).toEqual(MOCK_JSON);
  });
});
