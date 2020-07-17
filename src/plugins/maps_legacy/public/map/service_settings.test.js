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

jest.mock('../kibana_services', () => ({
  getKibanaVersion() {
    return '1.2.3';
  },
}));

import url from 'url';

import EMS_FILES from '../__tests__/map/ems_mocks/sample_files.json';
import EMS_TILES from '../__tests__/map/ems_mocks/sample_tiles.json';
import EMS_STYLE_ROAD_MAP_BRIGHT from '../__tests__/map/ems_mocks/sample_style_bright';
import EMS_STYLE_ROAD_MAP_DESATURATED from '../__tests__/map/ems_mocks/sample_style_desaturated';
import EMS_STYLE_DARK_MAP from '../__tests__/map/ems_mocks/sample_style_dark';
import { ORIGIN } from '../common/constants/origin';
import { ServiceSettings } from './service_settings';

describe('service_settings (FKA tile_map test)', function () {
  const emsFileApiUrl = 'https://files.foobar';
  const emsTileApiUrl = 'https://tiles.foobar';

  const defaultMapConfig = {
    emsFileApiUrl,
    emsTileApiUrl,
    includeElasticMapsService: true,
    emsTileLayerId: {
      bright: 'road_map',
      desaturated: 'road_map_desaturated',
      dark: 'dark_map',
    },
  };

  const defaultTilemapConfig = {
    deprecated: {
      config: {
        options: {},
      },
    },
  };

  function makeServiceSettings(mapConfigOptions = {}, tilemapOptions = {}) {
    const serviceSettings = new ServiceSettings(
      { ...defaultMapConfig, ...mapConfigOptions },
      { ...defaultTilemapConfig, ...tilemapOptions }
    );
    serviceSettings.__debugStubManifestCalls(async (url) => {
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
    return serviceSettings;
  }

  describe('TMS', function () {
    it('should NOT get url from the config', async function () {
      const serviceSettings = makeServiceSettings();
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').toEqual(true);
    });

    it('should get url by resolving dynamically', async function () {
      const serviceSettings = makeServiceSettings();
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.url === 'undefined').toEqual(true);

      const attrs = await serviceSettings.getAttributesForTMSLayer(tmsService);
      expect(attrs.url.includes('{x}')).toEqual(true);
      expect(attrs.url.includes('{y}')).toEqual(true);
      expect(attrs.url.includes('{z}')).toEqual(true);
      expect(attrs.attribution).toEqual(
        '<a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">&lt;iframe id=\'iframe\' style=\'position:fixed;height: 40%;width: 100%;top: 60%;left: 5%;right:5%;border: 0px;background:white;\' src=\'http://256.256.256.256\'&gt;&lt;/iframe&gt;</a>'
      );

      const urlObject = url.parse(attrs.url, true);
      expect(urlObject.hostname).toEqual('tiles.foobar');
      expect(urlObject.query.my_app_name).toEqual('kibana');
      expect(urlObject.query.elastic_tile_service_tos).toEqual('agree');
      expect(typeof urlObject.query.my_app_version).toEqual('string');
    });

    it('should get options', async function () {
      const serviceSettings = makeServiceSettings();
      const tmsServices = await serviceSettings.getTMSServices();
      const tmsService = tmsServices[0];
      expect(typeof tmsService.minZoom).toEqual('number');
      expect(typeof tmsService.maxZoom).toEqual('number');
      expect(tmsService.attribution.includes('OpenStreetMap')).toEqual(true);
    });

    describe('modify - url', function () {
      let tilemapServices;

      let serviceSettings;
      async function assertQuery(expected) {
        const attrs = await serviceSettings.getAttributesForTMSLayer(tilemapServices[0]);
        const urlObject = url.parse(attrs.url, true);
        Object.keys(expected).forEach((key) => {
          expect(urlObject.query[key]).toEqual(expected[key]);
        });
      }

      it('accepts an object', async () => {
        serviceSettings = makeServiceSettings();
        serviceSettings.setQueryParams({ foo: 'bar' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar' });
      });

      it('merged additions with previous values', async () => {
        // ensure that changes are always additive
        serviceSettings = makeServiceSettings();
        serviceSettings.setQueryParams({ foo: 'bar' });
        serviceSettings.setQueryParams({ bar: 'stool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'bar', bar: 'stool' });
      });

      it('overwrites conflicting previous values', async () => {
        serviceSettings = makeServiceSettings();
        // ensure that conflicts are overwritten
        serviceSettings.setQueryParams({ foo: 'bar' });
        serviceSettings.setQueryParams({ bar: 'stool' });
        serviceSettings.setQueryParams({ foo: 'tstool' });
        tilemapServices = await serviceSettings.getTMSServices();
        await assertQuery({ foo: 'tstool', bar: 'stool' });
      });

      it('should merge in tilemap url', async () => {
        serviceSettings = makeServiceSettings(
          {},
          {
            deprecated: {
              isOverridden: true,
              config: {
                url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: { minZoom: 0, maxZoom: 20 },
              },
            },
          }
        );

        const tilemapServices = await serviceSettings.getTMSServices();
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
              '<a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">&lt;iframe id=\'iframe\' style=\'position:fixed;height: 40%;width: 100%;top: 60%;left: 5%;right:5%;border: 0px;background:white;\' src=\'http://256.256.256.256\'&gt;&lt;/iframe&gt;</a>',
            subdomains: [],
          },
        ];

        const assertions = tilemapServices.map(async (actualService, index) => {
          const expectedService = expected[index];
          expect(actualService.id).toEqual(expectedService.id);
          expect(actualService.attribution).toEqual(expectedService.attribution);
          const attrs = await serviceSettings.getAttributesForTMSLayer(actualService);
          expect(attrs.url).toEqual(expectedService.url);
        });

        return Promise.all(assertions);
      });

      it('should load appropriate EMS attributes for desaturated and dark theme', async () => {
        serviceSettings = makeServiceSettings();
        const tilemapServices = await serviceSettings.getTMSServices();
        const roadMapService = tilemapServices.find((service) => service.id === 'road_map');

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

        expect(desaturationFalse.url).toEqual(
          'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(desaturationFalse.maxZoom).toEqual(10);
        expect(desaturationTrue.url).toEqual(
          'https://tiles.foobar/raster/styles/osm-bright-desaturated/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(desaturationTrue.maxZoom).toEqual(18);
        expect(darkThemeDesaturationFalse.url).toEqual(
          'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(darkThemeDesaturationFalse.maxZoom).toEqual(22);
        expect(darkThemeDesaturationTrue.url).toEqual(
          'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3'
        );
        expect(darkThemeDesaturationTrue.maxZoom).toEqual(22);
      });

      it('should exclude EMS', async () => {
        serviceSettings = makeServiceSettings(
          {
            includeElasticMapsService: false,
          },
          {
            deprecated: {
              isOverridden: true,
              config: {
                url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: { minZoom: 0, maxZoom: 20 },
              },
            },
          }
        );
        const tilemapServices = await serviceSettings.getTMSServices();
        const expected = [
          {
            attribution: '',
            url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            id: 'TMS in config/kibana.yml',
          },
        ];
        expect(tilemapServices.length).toEqual(1);
        expect(tilemapServices[0].attribution).toEqual(expected[0].attribution);
        expect(tilemapServices[0].id).toEqual(expected[0].id);
        const attrs = await serviceSettings.getAttributesForTMSLayer(tilemapServices[0]);
        expect(attrs.url).toEqual(expected[0].url);
      });

      it('should exclude all when not configured', async () => {
        serviceSettings = makeServiceSettings({
          includeElasticMapsService: false,
        });
        const tilemapServices = await serviceSettings.getTMSServices();
        const expected = [];
        expect(tilemapServices).toEqual(expected);
      });
    });
  });

  describe('File layers', function () {
    it('should load manifest (all props)', async function () {
      const serviceSettings = makeServiceSettings();
      serviceSettings.setQueryParams({ foo: 'bar' });
      const fileLayers = await serviceSettings.getFileLayers();
      expect(fileLayers.length).toEqual(19);
      const assertions = fileLayers.map(async function (fileLayer) {
        expect(fileLayer.origin).toEqual(ORIGIN.EMS);
        const fileUrl = await serviceSettings.getUrlForRegionLayer(fileLayer);
        const urlObject = url.parse(fileUrl, true);
        Object.keys({ foo: 'bar', elastic_tile_service_tos: 'agree' }).forEach((key) => {
          expect(typeof urlObject.query[key]).toEqual('string');
        });
      });

      return Promise.all(assertions);
    });

    it('should load manifest (individual props)', async () => {
      const expected = {
        attribution:
          '<a rel="noreferrer noopener" href="http://www.naturalearthdata.com/about/terms-of-use">Made with NaturalEarth</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a>',
        format: 'geojson',
        fields: [
          { type: 'id', name: 'iso2', description: 'ISO 3166-1 alpha-2 code' },
          { type: 'id', name: 'iso3', description: 'ISO 3166-1 alpha-3 code' },
          { type: 'property', name: 'name', description: 'name' },
        ],
        created_at: '2017-04-26T17:12:15.978370', //not present in 6.6
        name: 'World Countries',
      };

      const serviceSettings = makeServiceSettings();
      const fileLayers = await serviceSettings.getFileLayers();
      const actual = fileLayers[0];

      expect(expected.attribution).toEqual(actual.attribution);
      expect(expected.format).toEqual(actual.format);
      expect(expected.fields).toEqual(actual.fields);
      expect(expected.name).toEqual(actual.name);

      expect(expected.created_at).toEqual(actual.created_at);
    });

    it('should exclude all when not configured', async () => {
      const serviceSettings = makeServiceSettings({
        includeElasticMapsService: false,
      });
      const fileLayers = await serviceSettings.getFileLayers();
      const expected = [];
      expect(fileLayers).toEqual(expected);
    });

    it('should get hotlink', async () => {
      const serviceSettings = makeServiceSettings();
      const fileLayers = await serviceSettings.getFileLayers();
      const hotlink = await serviceSettings.getEMSHotLink(fileLayers[0]);
      expect(hotlink).toEqual('?locale=en#file/world_countries'); //url host undefined becuase emsLandingPageUrl is set at kibana-load
    });

    it('should sanitize EMS attribution', async () => {
      const serviceSettings = makeServiceSettings();
      const fileLayers = await serviceSettings.getFileLayers();
      const fileLayer = fileLayers.find((layer) => {
        return layer.id === 'world_countries_with_compromised_attribution';
      });
      expect(fileLayer.attribution).toEqual(
        '<a rel="noreferrer noopener" href="http://www.naturalearthdata.com/about/terms-of-use">&lt;div onclick=\'alert(1\')&gt;Made with NaturalEarth&lt;/div&gt;</a> | <a rel="noreferrer noopener">Elastic Maps Service</a>'
      );
    });
  });
});
