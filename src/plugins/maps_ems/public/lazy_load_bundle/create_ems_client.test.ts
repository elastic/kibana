/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { EMSSettings } from '../../common/ems_settings';
import {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
  DEFAULT_EMS_REST_VERSION,
} from '../../common/ems_defaults';
import { createEMSClient } from './create_ems_client';

import type { EMSConfig } from '../../common/ems_settings';
import { BuildFlavor } from '@kbn/config/src/types';
import { LATEST_API_URL_PATH } from '@elastic/ems-client';

const IS_ENTERPRISE_PLUS = () => true;

describe('createEMSClient', () => {
  const mockConfig: EMSConfig = {
    includeElasticMapsService: true,
    emsUrl: '',
    emsFileApiUrl: DEFAULT_EMS_FILE_API_URL,
    emsTileApiUrl: DEFAULT_EMS_TILE_API_URL,
    emsLandingPageUrl: DEFAULT_EMS_LANDING_PAGE_URL,
    emsFontLibraryUrl: DEFAULT_EMS_FONT_LIBRARY_URL,
  };
  const emsSettings = new EMSSettings(mockConfig, IS_ENTERPRISE_PLUS);

  describe('settings for traditional (SemVer)', () => {
    const kbnVersion = '8.7.6';
    const minorKbnVersion = 'v8.7';
    const build: BuildFlavor = 'traditional';
    const emsClient = createEMSClient(emsSettings, kbnVersion, build);

    test('should point to the /vX.Y folder on traditional SemVer (X.Y.Z)', () => {
      expect(emsClient.getLandingPageUrl()).toBe(
        DEFAULT_EMS_LANDING_PAGE_URL + '/' + minorKbnVersion
      );
    });

    test('client should use the Kibana Version as my_app_version query param', () => {
      const clientParams = new URLSearchParams(emsClient.extendUrlWithParams('https://my.host'));
      expect(clientParams.get('my_app_version')).toBe(kbnVersion);
    });

    test('client should point to /vX.Y on the services URLs ', async () => {
      const { services } = await emsClient.getMainManifest();

      ['tms', 'file'].map((type) => {
        const service = services.find((s) => s.type === type);
        expect(service?.manifest.match(minorKbnVersion));
      });
    });

    test('fetch function should not include the serverless header', async () => {
      global.fetch = jest.fn((_, { headers }: { headers: Headers }) => {
        expect(headers.has(ELASTIC_HTTP_VERSION_HEADER)).toBeFalsy();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ layers: [{ layer_id: 'mock_1' }] }),
        });
      }) as jest.Mock;

      const mocked = await emsClient.getFileLayers();
      // Ensure we ran the mocked function
      expect(mocked[0].getId()).toBe('mock_1');
    });
  });

  describe('Override settings for serverless', () => {
    const kbnVersion: string = 'foo';
    const build: BuildFlavor = 'serverless';

    const emsClient = createEMSClient(emsSettings, kbnVersion, build);

    test('should point to the root', () => {
      expect(emsClient.getLandingPageUrl()).toBe(DEFAULT_EMS_LANDING_PAGE_URL);
    });

    test('client should use DEFAULT_EMS_REST_VERSION as my_app_version query param ', () => {
      const clientParams = new URLSearchParams(emsClient.extendUrlWithParams('https://my.host'));
      expect(clientParams.get('my_app_version')).toBe(DEFAULT_EMS_REST_VERSION);
    });

    test('client should point to /LATEST_API_URL_PATH on the services URLs ', async () => {
      const { services } = await emsClient.getMainManifest();

      ['tms', 'file'].map((type) => {
        const service = services.find((s) => s.type === type);
        expect(service?.manifest.match(LATEST_API_URL_PATH));
      });
    });

    test('fetch function should include the serverless header', async () => {
      global.fetch = jest.fn((_, { headers }: { headers: Headers }) => {
        expect(headers.get(ELASTIC_HTTP_VERSION_HEADER)).toBe(DEFAULT_EMS_REST_VERSION);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ layers: [{ layer_id: 'mock_2' }] }),
        });
      }) as jest.Mock;

      const mocked = await emsClient.getFileLayers();
      // Ensure we ran the mocked function
      expect(mocked[0].getId()).toBe('mock_2');
    });
  });
});
