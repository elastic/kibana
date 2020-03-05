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
import _ from 'lodash';
import ChoroplethLayer from '../choropleth_layer';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import { ImageComparator } from 'test_utils/image_comparator';
import worldJson from './world.json';
import EMS_CATALOGUE from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_manifest.json';
import EMS_FILES from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_files.json';
import EMS_TILES from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_tiles.json';
import EMS_STYLE_ROAD_MAP_BRIGHT from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_style_bright';
import EMS_STYLE_ROAD_MAP_DESATURATED from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_style_desaturated';
import EMS_STYLE_DARK_MAP from '../../../../ui/public/vis/__tests__/map/ems_mocks/sample_style_dark';

import initialPng from './initial.png';
import toiso3Png from './toiso3.png';
import afterresizePng from './afterresize.png';
import afterdatachangePng from './afterdatachange.png';
import afterdatachangeandresizePng from './afterdatachangeandresize.png';
import aftercolorchangePng from './aftercolorchange.png';
import changestartupPng from './changestartup.png';
import {
  setup as visualizationsSetup,
  start as visualizationsStart,
} from '../../../visualizations/public/np_ready/public/legacy';

import { createRegionMapVisualization } from '../region_map_visualization';
import { createRegionMapTypeDefinition } from '../region_map_type';

const THRESHOLD = 0.45;
const PIXEL_DIFF = 96;

describe('RegionMapsVisualizationTests', function() {
  let domNode;
  let RegionMapsVisualization;
  let indexPattern;
  let vis;
  let dependencies;

  let imageComparator;

  const _makeJsonAjaxCallOld = ChoroplethLayer.prototype._makeJsonAjaxCall;

  const dummyTableGroup = {
    columns: [
      {
        id: 'col-0',
        aggConfig: {
          id: '2',
          enabled: true,
          type: 'terms',
          schema: 'segment',
          params: { field: 'geo.dest', size: 5, order: 'desc', orderBy: '1' },
        },
        title: 'geo.dest: Descending',
      },
      {
        id: 'col-1',
        aggConfig: { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
        title: 'Count',
      },
    ],
    rows: [
      { 'col-0': 'CN', 'col-1': 26 },
      { 'col-0': 'IN', 'col-1': 17 },
      { 'col-0': 'US', 'col-1': 6 },
      { 'col-0': 'DE', 'col-1': 4 },
      { 'col-0': 'BR', 'col-1': 3 },
    ],
  };

  let visRegComplete = false;

  beforeEach(ngMock.module('kibana'));

  let getManifestStub;
  beforeEach(
    ngMock.inject((Private, $injector) => {
      const serviceSettings = $injector.get('serviceSettings');
      const uiSettings = $injector.get('config');
      const regionmapsConfig = {
        includeElasticMapsService: true,
        layers: [],
      };

      dependencies = {
        serviceSettings,
        $injector,
        regionmapsConfig,
        uiSettings,
      };

      if (!visRegComplete) {
        visRegComplete = true;
        visualizationsSetup.types.createBaseVisualization(
          createRegionMapTypeDefinition(dependencies)
        );
      }

      RegionMapsVisualization = createRegionMapVisualization(dependencies);
      indexPattern = Private(LogstashIndexPatternStubProvider);

      ChoroplethLayer.prototype._makeJsonAjaxCall = async function() {
        //simulate network call
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(worldJson);
          }, 10);
        });
      };

      getManifestStub = serviceSettings.__debugStubManifestCalls(async url => {
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

  afterEach(function() {
    ChoroplethLayer.prototype._makeJsonAjaxCall = _makeJsonAjaxCallOld;
    getManifestStub.removeStub();
  });

  describe('RegionMapVisualization - basics', function() {
    beforeEach(async function() {
      setupDOM('512px', '512px');

      imageComparator = new ImageComparator();

      vis = new visualizationsStart.Vis(indexPattern, {
        type: 'region_map',
      });

      vis.params.bucket = {
        accessor: 0,
      };
      vis.params.metric = {
        accessor: 1,
      };

      vis.params.selectedJoinField = { name: 'iso2', description: 'Two letter abbreviation' };
      vis.params.selectedLayer = {
        attribution:
          '<p><a href="http://www.naturalearthdata.com/about/terms-of-use">Made with NaturalEarth</a> | <a href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>&#10;',
        name: 'World Countries',
        format: 'geojson',
        url:
          'https://vector-staging.maps.elastic.co/blob/5715999101812736?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1',
        fields: [
          { name: 'iso2', description: 'Two letter abbreviation' },
          {
            name: 'iso3',
            description: 'Three letter abbreviation',
          },
          { name: 'name', description: 'Country name' },
        ],
        created_at: '2017-07-31T16:00:19.996450',
        id: 5715999101812736,
        layerId: 'elastic_maps_service.World Countries',
      };
    });

    afterEach(function() {
      teardownDOM();
      imageComparator.destroy();
    });

    it('should instantiate at zoom level 2 (may fail in dev env)', async function() {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });
      const mismatchedPixels = await compareImage(initialPng);
      regionMapsVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should update after resetting join field', async function() {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      //this will actually create an empty image
      vis.params.selectedJoinField = { name: 'iso3', description: 'Three letter abbreviation' };
      vis.params.isDisplayWarning = false; //so we don't get notifications
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(toiso3Png);
      regionMapsVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should resize (may fail in dev env)', async function() {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      domNode.style.width = '256px';
      domNode.style.height = '128px';
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false,
      });
      const mismatchedPixelsAfterFirstResize = await compareImage(afterresizePng);

      domNode.style.width = '512px';
      domNode.style.height = '512px';
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false,
      });
      const mismatchedPixelsAfterSecondResize = await compareImage(initialPng);

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterFirstResize).to.be.lessThan(PIXEL_DIFF);
      expect(mismatchedPixelsAfterSecondResize).to.be.lessThan(PIXEL_DIFF);
    });

    it('should redo data (may fail in dev env)', async function() {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const newTableGroup = _.cloneDeep(dummyTableGroup);

      newTableGroup.rows.pop(); //remove one shape

      await regionMapsVisualization.render(newTableGroup, vis.params, {
        resize: false,
        params: false,
        aggs: false,
        data: true,
        uiState: false,
      });

      const mismatchedPixelsAfterDataChange = await compareImage(afterdatachangePng);
      const anotherTableGroup = _.cloneDeep(newTableGroup);

      anotherTableGroup.rows.pop(); //remove one shape
      domNode.style.width = '412px';
      domNode.style.height = '112px';
      await regionMapsVisualization.render(anotherTableGroup, vis.params, {
        resize: true,
        params: false,
        aggs: false,
        data: true,
        uiState: false,
      });
      const mismatchedPixelsAfterDataChangeAndResize = await compareImage(
        afterdatachangeandresizePng
      );

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterDataChange).to.be.lessThan(PIXEL_DIFF);
      expect(mismatchedPixelsAfterDataChangeAndResize).to.be.lessThan(PIXEL_DIFF);
    });

    it('should redo data and color ramp (may fail in dev env)', async function() {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const newTableGroup = _.cloneDeep(dummyTableGroup);
      newTableGroup.rows.pop(); //remove one shape
      vis.params.colorSchema = 'Blues';
      await regionMapsVisualization.render(newTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: false,
        data: true,
        uiState: false,
      });
      const mismatchedPixelsAfterDataAndColorChange = await compareImage(aftercolorchangePng);

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterDataAndColorChange).to.be.lessThan(PIXEL_DIFF);
    });

    it('should zoom and center elsewhere', async function() {
      vis.params.mapZoom = 4;
      vis.params.mapCenter = [36, -85];
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const mismatchedPixels = await compareImage(changestartupPng);
      regionMapsVisualization.destroy();

      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });
  });

  async function compareImage(expectedImageSource) {
    const elementList = domNode.querySelectorAll('canvas');
    expect(elementList.length).to.equal(1);
    const firstCanvasOnMap = elementList[0];
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
