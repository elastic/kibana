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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { ImageComparator } from 'test_utils/image_comparator';
import dummyESResponse from './dummy_es_response.json';
import initial from './initial.png';
import blues from './blues.png';
import shadedGeohashGrid from './shaded_geohash_grid.png';
import heatmapRaw from './heatmap_raw.png';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_CATALOGUE from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_manifest.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_FILES from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_files.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_TILES from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_tiles.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_STYLE_ROAD_MAP_BRIGHT from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_style_bright';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_STYLE_ROAD_MAP_DESATURATED from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_style_desaturated';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import EMS_STYLE_DARK_MAP from '../../../maps_legacy/public/__tests__/map/ems_mocks/sample_style_dark';

import { createTileMapVisualization } from '../tile_map_visualization';
import { createTileMapTypeDefinition } from '../tile_map_type';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExprVis } from '../../../visualizations/public/expressions/vis';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { BaseVisType } from '../../../visualizations/public/vis_types/base_vis_type';
import {
  getPrecision,
  getZoomPrecision,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../maps_legacy/public/map/precision';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceSettings } from '../../../maps_legacy/public/map/service_settings';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaMap } from '../../../maps_legacy/public/map/kibana_map';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { BaseMapsVisualizationProvider } from '../../../maps_legacy/public/map/base_maps_visualization';

function mockRawData() {
  const stack = [dummyESResponse];
  let node;
  do {
    node = stack.pop();
    if (typeof node === 'object') {
      // eslint-disable-next-line guard-for-in
      for (const key in node) {
        if (node.hasOwnProperty(key)) {
          if (key === 'aggConfig') {
            node[key].makeLabel = () => 'foobar';
          }
        }
        stack.push(node[key]);
      }
    }
  } while (stack.length);
}
mockRawData();

const THRESHOLD = 0.45;
const PIXEL_DIFF = 64;

describe('CoordinateMapsVisualizationTest', function () {
  let domNode;
  let CoordinateMapsVisualization;
  let vis;
  let dependencies;
  let visType;

  let imageComparator;

  let getManifestStub;
  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject((Private, $injector) => {
      const mapConfig = {
        emsFileApiUrl: '',
        emsTileApiUrl: '',
        emsLandingPageUrl: '',
      };
      const tilemapsConfig = {
        deprecated: {
          config: {
            options: {
              attribution: '123',
            },
          },
        },
      };

      const serviceSettings = new ServiceSettings(mapConfig, tilemapsConfig);
      const BaseMapsVisualization = new BaseMapsVisualizationProvider(
        (...args) => new KibanaMap(...args),
        serviceSettings
      );
      const uiSettings = $injector.get('config');

      dependencies = {
        getZoomPrecision,
        getPrecision,
        BaseMapsVisualization,
        uiSettings,
        serviceSettings,
      };

      visType = new BaseVisType(createTileMapTypeDefinition(dependencies));

      CoordinateMapsVisualization = createTileMapVisualization(dependencies);

      getManifestStub = serviceSettings.__debugStubManifestCalls(async (url) => {
        //simulate network calls
        if (url.startsWith('https://foobar')) {
          return EMS_CATALOGUE;
        } else if (url.startsWith('https://tiles.foobar')) {
          return EMS_TILES;
        } else if (url.startsWith('https://files.foobar')) {
          return EMS_FILES;
        } else if (url.startsWith('https://raster-style.foobar')) {
          if (url.includes('osm-bright-desaturated')) {
            return EMS_STYLE_ROAD_MAP_DESATURATED;
          } else if (url.includes('osm-bright')) {
            return EMS_STYLE_ROAD_MAP_BRIGHT;
          } else if (url.includes('dark-matter')) {
            return EMS_STYLE_DARK_MAP;
          }
        }
      });
    })
  );

  afterEach(() => {
    getManifestStub.removeStub();
  });

  describe('CoordinateMapsVisualization - basics', function () {
    beforeEach(async function () {
      setupDOM('512px', '512px');

      imageComparator = new ImageComparator();
      vis = new ExprVis({
        type: visType,
      });
      vis.params = {
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatClusterSize: 1.5,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [0, 0],
        dimensions: {
          metric: {
            accessor: 1,
            label: 'test',
            format: { id: 'string' },
          },
          bucket: {
            accessor: 0,
          },
        },
      };
      const mockAggs = {
        byType: (type) => {
          return mockAggs.aggs.find((agg) => agg.type.type === type);
        },
        aggs: [
          {
            type: {
              type: 'metrics',
            },
            fieldFormatter: (x) => {
              return x;
            },
            makeLabel: () => {
              return 'foobar';
            },
          },
          {
            type: {
              type: 'buckets',
            },
            params: { useGeoCentroid: true },
          },
        ],
      };
      vis.getAggConfig = function () {
        return mockAggs;
      };
      vis.aggs = mockAggs;
    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    it('should initialize OK (may fail in dev env)', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(initial, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should toggle to Heatmap OK', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      vis.params.mapType = 'Heatmap';
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(heatmapRaw, 1);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should toggle back&forth OK between mapTypes (may fail in dev env)', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      vis.params.mapType = 'Heatmap';
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      vis.params.mapType = 'Scaled Circle Markers';
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(initial, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should toggle to different color schema ok (may fail in dev env)', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      vis.params.colorSchema = 'Blues';
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(blues, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should toggle to different color schema and maptypes ok', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      vis.params.colorSchema = 'Greens';
      vis.params.mapType = 'Shaded Geohash Grid';
      await coordinateMapVisualization.render(dummyESResponse, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(shadedGeohashGrid, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });
  });

  async function compareImage(expectedImageSource, index) {
    const elementList = domNode.querySelectorAll('canvas');
    const firstCanvasOnMap = elementList[index];
    return imageComparator.compareImage(firstCanvasOnMap, expectedImageSource, THRESHOLD);
  }

  function setupDOM(width, height) {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = width;
    domNode.style.height = height;
    domNode.style.position = 'fixed';
    domNode.style.border = '1px solid blue';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }
});
