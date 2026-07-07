/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '@kbn/maps-ems-plugin/common';
import { ServiceSettings } from './service_settings';

function makeMockLayer({ id, min, max, attributions, url }) {
  return {
    getId() {
      return id;
    },
    getMinZoom() {
      return min;
    },
    getMaxZoom() {
      return max;
    },
    getAttributions() {
      return attributions;
    },
    getUrlTemplate() {
      return url;
    },
  };
}

function createMockEMSClient() {
  return {
    addQueryParams() {},
    getFileLayers() {
      return [
        {
          getDefaultFormatType() {
            return 'geojson';
          },
          getDefaultFormatMeta() {
            return {};
          },
          getDisplayName() {
            return 'Foobar Countries';
          },
          getId() {
            return 'foobar_countries';
          },
          getCreatedAt() {
            return {};
          },
          getFieldsInLanguage() {
            return [];
          },
          getAttributions() {
            return [{ url: 'http://foobar/com', label: 'foobar' }];
          },
        },
      ];
    },
    getTMSServices() {
      return [
        makeMockLayer({
          id: DEFAULT_EMS_ROADMAP_ID,
          min: 0,
          max: 10,
          attributions: [{ url: 'https://foobar.com', label: 'foobar' }],
          url: 'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl',
        }),
        makeMockLayer({
          id: DEFAULT_EMS_ROADMAP_DESATURATED_ID,
          min: 0,
          max: 18,
          attributions: [{ url: 'https://foobar.com', label: 'foobar' }],
          url: 'https://tiles.foobar/raster/styles/osm-bright-desaturated/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl',
        }),
        makeMockLayer({
          id: DEFAULT_EMS_DARKMAP_ID,
          min: 0,
          max: 22,
          attributions: [{ url: 'https://foobar.com', label: 'foobar' }],
          url: 'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl',
        }),
      ];
    },
  };
}

describe('service_settings (FKA tile_map test)', function () {
  const emsFileApiUrl = 'https://files.foobar';
  const emsTileApiUrl = 'https://tiles.foobar';

  const defaultMapConfig = {
    emsFileApiUrl,
    emsTileApiUrl,
    includeElasticMapsService: true,
    emsTileLayerId: {
      bright: DEFAULT_EMS_ROADMAP_ID,
      desaturated: DEFAULT_EMS_ROADMAP_DESATURATED_ID,
      dark: DEFAULT_EMS_DARKMAP_ID,
    },
  };

  const defaultTilemapConfig = {
    options: {},
  };

  function makeServiceSettings(mapConfigOptions = {}, tilemapOptions = {}) {
    return new ServiceSettings(
      { ...defaultMapConfig, ...mapConfigOptions },
      { ...defaultTilemapConfig, ...tilemapOptions },
      createMockEMSClient()
    );
  }

  describe('tms mods', function () {
    let serviceSettings;

    it('should merge in tilemap url', async () => {
      serviceSettings = makeServiceSettings(
        {},
        {
          url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: { minZoom: 0, maxZoom: 20 },
        }
      );

      const tilemapServices = await serviceSettings.getTMSServices();
      const expectedSelection = [
        {
          attribution: '',
          url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          id: 'TMS in config/kibana.yml',
        },
        {
          id: DEFAULT_EMS_ROADMAP_ID,
          name: 'Road Map - Bright',
          url: 'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl',
          minZoom: 0,
          maxZoom: 10,
          attribution: `<a rel=\"noreferrer noopener\" href=\"https://foobar.com\">foobar</a>`,
          subdomains: [],
        },
      ];

      expect(tilemapServices.length).toEqual(2); //needs to only include 1 base-map iso 3

      const assertions = tilemapServices.map(async (actualService, index) => {
        const expectedService = expectedSelection[index];
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
      const roadMapService = tilemapServices.find(
        (service) => service.id === DEFAULT_EMS_ROADMAP_ID
      );

      const desaturationFalse = await serviceSettings.getAttributesForTMSLayer(
        roadMapService,
        false,
        false
      );
      expect(desaturationFalse.url).toEqual(
        'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl'
      );
      expect(desaturationFalse.maxZoom).toEqual(10);

      const desaturationTrue = await serviceSettings.getAttributesForTMSLayer(
        roadMapService,
        true,
        false
      );
      expect(desaturationTrue.url).toEqual(
        'https://tiles.foobar/raster/styles/osm-bright-desaturated/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl'
      );
      expect(desaturationTrue.maxZoom).toEqual(18);

      const darkThemeDesaturationFalse = await serviceSettings.getAttributesForTMSLayer(
        roadMapService,
        false,
        true
      );
      expect(darkThemeDesaturationFalse.url).toEqual(
        'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl'
      );
      expect(darkThemeDesaturationFalse.maxZoom).toEqual(22);

      const darkThemeDesaturationTrue = await serviceSettings.getAttributesForTMSLayer(
        roadMapService,
        true,
        true
      );

      expect(darkThemeDesaturationTrue.url).toEqual(
        'https://tiles.foobar/raster/styles/dark-matter/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=1.2.3&license=sspl'
      );
      expect(darkThemeDesaturationTrue.maxZoom).toEqual(22);
    });

    it('should exclude EMS', async () => {
      serviceSettings = makeServiceSettings(
        {
          includeElasticMapsService: false,
        },
        {
          url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: { minZoom: 0, maxZoom: 20 },
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

    it('should exclude all when no tilemap configured in the yml', async () => {
      serviceSettings = makeServiceSettings({
        includeElasticMapsService: false,
      });
      const tilemapServices = await serviceSettings.getTMSServices();
      expect(tilemapServices).toEqual([]);
    });
  });

  describe('File layers', function () {
    it('should exclude all when not configured', async () => {
      const serviceSettings = makeServiceSettings({
        includeElasticMapsService: false,
      });
      const fileLayers = await serviceSettings.getFileLayers();
      const expected = [];
      expect(fileLayers).toEqual(expected);
    });

    it('should sanitize EMS attribution', async () => {
      const serviceSettings = makeServiceSettings();
      const fileLayers = await serviceSettings.getFileLayers();
      const fileLayer = fileLayers.find((layer) => {
        return layer.id === 'foobar_countries';
      });
      expect(fileLayer.attribution).toEqual(
        `<a rel=\"noreferrer noopener\" href=\"http://foobar/com\">foobar</a>`
      );
    });
  });
});
