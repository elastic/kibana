/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MapServiceSettings } from './map_service_settings';
import { MapsLegacyConfig } from '../../../../maps_legacy/config';
import { TMSService } from '@elastic/ems-client';

describe('vega_map_view/map_service_settings', () => {
  describe('MapServiceSettings', () => {
    const appVersion = '99';
    let config: MapsLegacyConfig;

    beforeEach(() => {
      config = {} as MapsLegacyConfig;
    });

    test('should be able to create instance of MapServiceSettings', () => {
      const mapServiceSettings = new MapServiceSettings(config, appVersion);

      expect(mapServiceSettings instanceof MapServiceSettings).toBeTruthy();
      expect(mapServiceSettings.isInitialized).toBeFalsy();
      expect(mapServiceSettings.hasUserConfiguredTmsLayer).toBeFalsy();
      expect(mapServiceSettings.defaultTmsLayer).toBe('road_map');
    });

    test('should be able to set user configured base layer through config', () => {
      const mapServiceSettings = new MapServiceSettings(
        {
          ...config,
          tilemap: {
            url: 'http://some.tile.com/map/{z}/{x}/{y}.jpg',
            options: {
              attribution: 'attribution',
              minZoom: 0,
              maxZoom: 4,
            },
          },
        },
        appVersion
      );

      expect(mapServiceSettings.defaultTmsLayer).toBe('user_configured');
      expect(mapServiceSettings.hasUserConfiguredTmsLayer).toBeTruthy();
    });

    test('getAttributionsForTmsService method should return attributes in a correct form', () => {
      const mapServiceSettings = new MapServiceSettings(config, appVersion);
      const tmsService = ({
        getAttributions: jest.fn(() => [
          { url: 'https://fist_attr.com', label: 'fist_attr' },
          { url: 'https://second_attr.com', label: 'second_attr' },
        ]),
      } as unknown) as TMSService;

      expect(mapServiceSettings.getAttributionsForTmsService(tmsService)).toMatchInlineSnapshot(`
        Array [
          "<a rel=\\"noreferrer noopener\\" href=\\"https://fist_attr.com\\">fist_attr</a>",
          "<a rel=\\"noreferrer noopener\\" href=\\"https://second_attr.com\\">second_attr</a>",
        ]
      `);
    });
  });
});
