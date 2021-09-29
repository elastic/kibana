/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { uiSettingsServiceMock } from 'src/core/public/mocks';

import { MapServiceSettings, getAttributionsForTmsService } from './map_service_settings';
import type { MapsEmsConfig } from '../../../../../maps_ems/public';
import { EMSClient, TMSService } from '@elastic/ems-client';
import { setUISettings } from '../../services';

const getPrivateField = <T>(mapServiceSettings: MapServiceSettings, privateField: string) =>
  get(mapServiceSettings, privateField) as T;

describe('vega_map_view/map_service_settings', () => {
  describe('MapServiceSettings', () => {
    const appVersion = '99';
    let config: MapsEmsConfig;
    let getUiSettingsMockedValue: any;

    beforeEach(() => {
      config = {
        emsTileLayerId: {
          desaturated: 'road_map_desaturated',
          dark: 'dark_map',
        },
      } as MapsEmsConfig;
      setUISettings({
        ...uiSettingsServiceMock.createSetupContract(),
        get: () => getUiSettingsMockedValue,
      });
    });

    test('should be able to create instance of MapServiceSettings', () => {
      const mapServiceSettings = new MapServiceSettings(config, appVersion);

      expect(mapServiceSettings instanceof MapServiceSettings).toBeTruthy();
      expect(mapServiceSettings.hasUserConfiguredTmsLayer()).toBeFalsy();
      expect(mapServiceSettings.defaultTmsLayer()).toBe('road_map_desaturated');
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

      expect(mapServiceSettings.defaultTmsLayer()).toBe('TMS in config/kibana.yml');
      expect(mapServiceSettings.hasUserConfiguredTmsLayer()).toBeTruthy();
    });

    test('should load ems client only on executing getTmsService method', async () => {
      const mapServiceSettings = new MapServiceSettings(config, appVersion);

      expect(getPrivateField<EMSClient>(mapServiceSettings, 'emsClient')).toBeUndefined();

      await mapServiceSettings.getTmsService('road_map');

      expect(
        getPrivateField<EMSClient>(mapServiceSettings, 'emsClient') instanceof EMSClient
      ).toBeTruthy();
    });

    test('should set isDarkMode value on executing getTmsService method', async () => {
      const mapServiceSettings = new MapServiceSettings(config, appVersion);
      getUiSettingsMockedValue = true;

      expect(getPrivateField<EMSClient>(mapServiceSettings, 'isDarkMode')).toBeFalsy();

      await mapServiceSettings.getTmsService('road_map');

      expect(getPrivateField<EMSClient>(mapServiceSettings, 'isDarkMode')).toBeTruthy();
    });

    test('getAttributionsForTmsService method should return attributes in a correct form', () => {
      const tmsService = {
        getAttributions: jest.fn(() => [
          { url: 'https://fist_attr.com', label: 'fist_attr' },
          { url: 'https://second_attr.com', label: 'second_attr' },
        ]),
      } as unknown as TMSService;

      expect(getAttributionsForTmsService(tmsService)).toMatchInlineSnapshot(`
        Array [
          "<a rel=\\"noreferrer noopener\\" href=\\"https://fist_attr.com\\">fist_attr</a>",
          "<a rel=\\"noreferrer noopener\\" href=\\"https://second_attr.com\\">second_attr</a>",
        ]
      `);
    });
  });
});
