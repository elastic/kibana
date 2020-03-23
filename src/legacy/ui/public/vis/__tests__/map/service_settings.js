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
import url from 'url';

import EMS_FILES from './ems_mocks/sample_files.json';
import EMS_TILES from './ems_mocks/sample_tiles.json';
import EMS_STYLE_ROAD_MAP_BRIGHT from './ems_mocks/sample_style_bright';
import EMS_STYLE_ROAD_MAP_DESATURATED from './ems_mocks/sample_style_desaturated';
import EMS_STYLE_DARK_MAP from './ems_mocks/sample_style_dark';
import { ORIGIN } from '../../../../../core_plugins/tile_map/common/origin';

describe('service_settings (FKA tilemaptest)', function() {
  let serviceSettings;
  let mapConfig;
  let tilemapsConfig;

  const emsFileApiUrl = 'https://files.foobar';
  const emsTileApiUrl = 'https://tiles.foobar';

  const emsTileApiUrl2 = 'https://tiles_override.foobar';
  const emsFileApiUrl2 = 'https://files_override.foobar';

  beforeEach(
    ngMock.module('kibana', $provide => {
      $provide.decorator('mapConfig', () => {
        return {
          emsFileApiUrl,
          emsTileApiUrl,
          includeElasticMapsService: true,
          emsTileLayerId: {
            bright: 'road_map',
            desaturated: 'road_map_desaturated',
            dark: 'dark_map',
          },
        };
      });
    })
  );

  let emsTileApiUrlOriginal;
  let emsFileApiUrlOriginal;
  let tilemapsConfigDeprecatedOriginal;
  let getManifestStub;
  beforeEach(
    ngMock.inject(function($injector, $rootScope) {
      serviceSettings = $injector.get('serviceSettings');
      getManifestStub = serviceSettings.__debugStubManifestCalls(async url => {
        //simulate network calls
        if (url.startsWith('https://tiles.foobar')) {
          if (url.includes('/manifest')) {
            return EMS_TILES;
          } else if (url.includes('osm-bright-desaturated.json')) {
            return EMS_STYLE_ROAD_MAP_DESATURATED;
          } else if (url.includes('osm-bright.json')) {
            return EMS_STYLE_ROAD_MAP_BRIGHT;
          } else if (url.includes('dark-matter.json')) {
            return EMS_STYLE_DARK_MAP;
          }
        } else if (url.startsWith('https://files.foobar')) {
          return EMS_FILES;
        }
      });
      mapConfig = $injector.get('mapConfig');
      tilemapsConfig = $injector.get('tilemapsConfig');

      emsTileApiUrlOriginal = mapConfig.emsTileApiUrl;
      emsFileApiUrlOriginal = mapConfig.emsFileApiUrl;

      tilemapsConfigDeprecatedOriginal = tilemapsConfig.deprecated;
      $rootScope.$digest();
    })
  );

  afterEach(function() {
    getManifestStub.removeStub();
    mapConfig.emsTileApiUrl = emsTileApiUrlOriginal;
    mapConfig.emsFileApiUrl = emsFileApiUrlOriginal;
    tilemapsConfig.deprecated = tilemapsConfigDeprecatedOriginal;
  });

  describe('TMS', function() {
    it('should NOT get url from the config', async function() {
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').to.equal(true);
    });

    it('should get url by resolving dynamically', async function() {
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').to.equal(true);

      const attrs = await serviceSettings.getAttributesForTMSLayer(tmsService);
      expect(attrs.url).to.contain('{x}');
      expect(attrs.url).to.contain('{y}');
      expect(attrs.url).to.contain('{z}');

      const urlObject = url.parse(attrs.url, true);
      expect(urlObject.hostname).to.be('tiles.foobar');
      expect(urlObject.query).to.have.property('my_app_name', 'kibana');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos', 'agree');
      expect(urlObject.query).to.have.property('my_app_version');
    });

    it('should get options', async function() {
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(tmsService).to.have.property('minZoom');
      expect(tmsService).to.have.property('maxZoom');
      expect(tmsService)
        .to.have.property('attribution')
        .contain('OpenStreetMap');
    });

    describe('modify - url', function() {
      let tilemapServices;

      async function assertQuery(expected) {
        const attrs = await serviceSettings.getAttributesForTMSLayer(tilemapServices[0]);
        const urlObject = url.parse(attrs.url, true);
        Object.keys(expected).forEach(key => {
          expect(urlObject.query).to.have.property(key, expected[key]);
        });
      }

      it('accepts an object', async () => {
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar' });
      });

      it('merged additions with previous values', async () => {
        // ensure that changes are always additive
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar', bar: 'stool' });
      });

      it('overwrites conflicting previous values', async () => {
        // ensure that conflicts are overwritten
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        serviceSettings.addQueryParams({ foo: 'tstool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'tstool', bar: 'stool' });
      });

      it('when overridden, should continue to work', async () => {
        mapConfig.emsFileApiUrl = emsFileApiUrl2;
        mapConfig.emsTileApiUrl = emsTileApiUrl2;
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar' });
      });

      it('should merge in tilemap url', async () => {
        tilemapsConfig.deprecated = {
          isOverridden: true,
          config: {
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { minZoom: 0, maxZoom: 20 },
          },
        };

        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [
          {
            attribution: '',
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            id: 'TMS in config/kibana.yml',
          },
          {
            id: 'road_map',
            name: 'Road Map - Bright',
            url:
              'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3',
            minZoom: 0,
            maxZoom: 10,
            attribution:
              '<a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a>',
            subdomains: [],
          },
        ];

        const assertions = tilemapServices.map(async (actualService, index) => {
          const expectedService = expected[index];
          expect(actualService.id).to.equal(expectedService.id);
          expect(actualService.attribution).to.equal(expectedService.attribution);
          const attrs = await serviceSettings.getAttributesForTMSLayer(actualService);
          expect(attrs.url).to.equal(expectedService.url);
        });

        return Promise.all(assertions);
      });

      it('should load appropriate EMS attributes for desaturated and dark theme', async () => {
        tilemapServices = await serviceSettings.getTMSServices();
        const roadMapService = tilemapServices.find(service => service.id === 'road_map');

        const desaturationFalse = await serviceSettings.getAttributesForTMSLayer(
          roadMapService,
          false,
          false
        );
        const desaturationTrue = await serviceSettings.getAttributesForTMSLayer(
          roadMapService,
          true,
          false
        );
        const darkThemeDesaturationFalse = await serviceSettings.getAttributesForTMSLayer(
          roadMapService,
          false,
          true
        );
        const darkThemeDesaturationTrue = await serviceSettings.getAttributesForTMSLayer(
          roadMapService,
          true,
          true
        );

        expect(desaturationFalse.url).to.equal(
          'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(desaturationFalse.maxZoom).to.equal(10);
        expect(desaturationTrue.url).to.equal(
          'https://tiles.foobar/raster/styles/osm-bright-desaturated/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(desaturationTrue.maxZoom).to.equal(18);
        expect(darkThemeDesaturationFalse.url).to.equal(
          'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(darkThemeDesaturationFalse.maxZoom).to.equal(22);
        expect(darkThemeDesaturationTrue.url).to.equal(
          'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(darkThemeDesaturationTrue.maxZoom).to.equal(22);
      });

      it('should exclude EMS', async () => {
        tilemapsConfig.deprecated = {
          isOverridden: true,
          config: {
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { minZoom: 0, maxZoom: 20 },
          },
        };
        mapConfig.includeElasticMapsService = false;

        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [
          {
            attribution: '',
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            id: 'TMS in config/kibana.yml',
          },
        ];
        expect(tilemapServices.length).to.eql(1);
        expect(tilemapServices[0].attribution).to.eql(expected[0].attribution);
        expect(tilemapServices[0].id).to.eql(expected[0].id);
        const attrs = await serviceSettings.getAttributesForTMSLayer(tilemapServices[0]);
        expect(attrs.url).to.equal(expected[0].url);
      });

      it('should exclude all when not configured', async () => {
        mapConfig.includeElasticMapsService = false;
        tilemapServices = await serviceSettings.getTMSServices();
        const expected = [];
        expect(tilemapServices).to.eql(expected);
      });
    });
  });

  describe('File layers', function() {
    it('should load manifest (all props)', async function() {
      serviceSettings.addQueryParams({ foo: 'bar' });
      const fileLayers = await serviceSettings.getFileLayers();
      expect(fileLayers.length).to.be(18);
      const assertions = fileLayers.map(async function(fileLayer) {
        expect(fileLayer.origin).to.be(ORIGIN.EMS);
        const fileUrl = await serviceSettings.getUrlForRegionLayer(fileLayer);
        const urlObject = url.parse(fileUrl, true);
        Object.keys({ foo: 'bar', elastic_tile_service_tos: 'agree' }).forEach(key => {
          expect(urlObject.query).to.have.property(key);
        });
      });

      return Promise.all(assertions);
    });

    it('should load manifest (individual props)', async () => {
      const expected = {
        attribution:
          '<a href="http://www.naturalearthdata.com/about/terms-of-use">Made with NaturalEarth</a> | <a href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a>',
        format: 'geojson',
        fields: [
          { type: 'id', name: 'iso2', description: 'ISO 3166-1 alpha-2 code' },
          { type: 'id', name: 'iso3', description: 'ISO 3166-1 alpha-3 code' },
          { type: 'property', name: 'name', description: 'name' },
        ],
        created_at: '2017-04-26T17:12:15.978370', //not present in 6.6
        name: 'World Countries',
      };

      const fileLayers = await serviceSettings.getFileLayers();
      const actual = fileLayers[0];

      expect(expected.attribution).to.eql(actual.attribution);
      expect(expected.format).to.eql(actual.format);
      expect(expected.fields).to.eql(actual.fields);
      expect(expected.name).to.eql(actual.name);

      expect(expected.created_at).to.eql(actual.created_at);
    });

    it('should exclude all when not configured', async () => {
      mapConfig.includeElasticMapsService = false;
      const fileLayers = await serviceSettings.getFileLayers();
      const expected = [];
      expect(fileLayers).to.eql(expected);
    });

    it('should get hotlink', async () => {
      const fileLayers = await serviceSettings.getFileLayers();
      const hotlink = await serviceSettings.getEMSHotLink(fileLayers[0]);
      expect(hotlink).to.eql('?locale=en#file/world_countries'); //url host undefined becuase emsLandingPageUrl is set at kibana-load
    });
  });
});
