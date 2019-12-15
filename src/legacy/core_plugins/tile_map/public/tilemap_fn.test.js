/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// eslint-disable-next-line
import { functionWrapper } from '../../../../plugins/expressions/public/functions/tests/utils';
import { createTileMapFn } from './tile_map_fn';

jest.mock('ui/new_platform');
jest.mock('ui/vis/map/convert_to_geojson', () => ({
  convertToGeoJson: jest.fn().mockReturnValue({
    featureCollection: {
      type: 'FeatureCollection',
      features: [],
    },
    meta: {
      min: null,
      max: null,
      geohashPrecision: null,
      geohashGridDimensionsAtEquator: null,
    },
  }),
}));

import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';

describe('interpreter/functions#tilemap', () => {
  const fn = functionWrapper(createTileMapFn);
  const context = {
    type: 'kibana_datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count' }],
  };
  const visConfig = {
    colorSchema: 'Yellow to Red',
    mapType: 'Scaled Circle Markers',
    isDesaturated: true,
    addTooltip: true,
    heatClusterSize: 1.5,
    legendPosition: 'bottomright',
    mapZoom: 2,
    mapCenter: [0, 0],
    wms: {
      enabled: false,
      options: {
        format: 'image/png',
        transparent: true,
      },
    },
    dimensions: {
      metric: {
        accessor: 0,
        format: {
          id: 'number',
        },
        params: {},
        aggType: 'count',
      },
      geohash: null,
      geocentroid: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(actual).toMatchSnapshot();
  });

  it('calls response handler with correct values', () => {
    const { geohash, metric, geocentroid } = visConfig.dimensions;
    fn(context, { visConfig: JSON.stringify(visConfig) });
    expect(convertToGeoJson).toHaveBeenCalledTimes(1);
    expect(convertToGeoJson).toHaveBeenCalledWith(context, {
      geohash,
      metric,
      geocentroid,
    });
  });
});
