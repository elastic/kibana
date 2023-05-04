/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EMSSettings } from './ems_settings';
import {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
} from './ems_defaults';
import type { EMSConfig } from './ems_settings';

const IS_ENTERPRISE_PLUS = () => true;

describe('EMSSettings', () => {
  const mockConfig: EMSConfig = {
    includeElasticMapsService: true,
    emsUrl: '',
    emsFileApiUrl: DEFAULT_EMS_FILE_API_URL,
    emsTileApiUrl: DEFAULT_EMS_TILE_API_URL,
    emsLandingPageUrl: DEFAULT_EMS_LANDING_PAGE_URL,
    emsFontLibraryUrl: DEFAULT_EMS_FONT_LIBRARY_URL,
  };

  describe('isEMSEnabled/isOnPrem', () => {
    test('should validate defaults', () => {
      const emsSettings = new EMSSettings(mockConfig, IS_ENTERPRISE_PLUS);
      expect(emsSettings.isEMSEnabled()).toBe(true);
      expect(emsSettings.isEMSUrlSet()).toBe(false);
    });

    test('should validate if on-prem is turned on', () => {
      const emsSettings = new EMSSettings(
        {
          ...mockConfig,
          ...{
            emsUrl: 'https://localhost:8080',
          },
        },
        IS_ENTERPRISE_PLUS
      );
      expect(emsSettings.isEMSEnabled()).toBe(true);
      expect(emsSettings.isEMSUrlSet()).toBe(true);
    });

    test('should not validate if ems turned off', () => {
      const emsSettings = new EMSSettings(
        {
          ...mockConfig,
          ...{
            includeElasticMapsService: false,
          },
        },
        IS_ENTERPRISE_PLUS
      );
      expect(emsSettings.isEMSEnabled()).toBe(false);
      expect(emsSettings.isEMSUrlSet()).toBe(false);
    });

    test('should work if ems is turned off, but on-prem is turned on', () => {
      const emsSettings = new EMSSettings(
        {
          ...mockConfig,
          ...{
            emsUrl: 'https://localhost:8080',
            includeElasticMapsService: false,
          },
        },
        IS_ENTERPRISE_PLUS
      );
      expect(emsSettings.isEMSEnabled()).toBe(true);
      expect(emsSettings.isEMSUrlSet()).toBe(true);
    });

    describe('when license is turned off', () => {
      test('should not be enabled', () => {
        const emsSettings = new EMSSettings(
          {
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
            },
          },
          () => false
        );
        expect(emsSettings.isEMSEnabled()).toBe(false);
        expect(emsSettings.isEMSUrlSet()).toBe(true);
      });
    });
  });

  describe('emsUrl setting', () => {
    describe('when emsUrl is not set', () => {
      test('should respect defaults', () => {
        const emsSettings = new EMSSettings(mockConfig, IS_ENTERPRISE_PLUS);
        expect(emsSettings.getEMSFileApiUrl()).toBe(DEFAULT_EMS_FILE_API_URL);
        expect(emsSettings.getEMSTileApiUrl()).toBe(DEFAULT_EMS_TILE_API_URL);
        expect(emsSettings.getEMSFontLibraryUrl()).toBe(DEFAULT_EMS_FONT_LIBRARY_URL);
        expect(emsSettings.getEMSLandingPageUrl()).toBe(DEFAULT_EMS_LANDING_PAGE_URL);
      });
      test('should apply overrides', () => {
        const emsSettings = new EMSSettings(
          {
            ...mockConfig,
            ...{
              emsFileApiUrl: 'https://file.foobar',
              emsTileApiUrl: 'https://tile.foobar',
              emsFontLibraryUrl: 'https://tile.foobar/font',
              emsLandingPageUrl: 'https://maps.foobar/v7.666',
            },
          },
          IS_ENTERPRISE_PLUS
        );
        expect(emsSettings.getEMSFileApiUrl()).toBe('https://file.foobar');
        expect(emsSettings.getEMSTileApiUrl()).toBe('https://tile.foobar');
        expect(emsSettings.getEMSFontLibraryUrl()).toBe('https://tile.foobar/font');
        expect(emsSettings.getEMSLandingPageUrl()).toBe('https://maps.foobar/v7.666');
      });
    });

    describe('when emsUrl is set', () => {
      test('should override defaults', () => {
        const emsSettings = new EMSSettings(
          {
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
            },
          },
          IS_ENTERPRISE_PLUS
        );
        expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
        expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
        expect(emsSettings.getEMSFontLibraryUrl()).toBe(
          'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
        );
        expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
      });

      describe('internal settings overrides (the below behavior is not publically supported, but aids internal debugging use-cases)', () => {
        test(`should override internal emsFileApiUrl`, () => {
          const emsSettings = new EMSSettings(
            {
              ...mockConfig,
              ...{
                emsUrl: 'https://localhost:8080',
                emsFileApiUrl: 'https://file.foobar',
              },
            },
            IS_ENTERPRISE_PLUS
          );
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://file.foobar');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test(`should override internal emsTileApiUrl`, () => {
          const emsSettings = new EMSSettings(
            {
              ...mockConfig,
              ...{
                emsUrl: 'https://localhost:8080',
                emsTileApiUrl: 'https://tile.foobar',
              },
            },
            IS_ENTERPRISE_PLUS
          );
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://tile.foobar');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test('should override internal emsFontLibraryUrl', () => {
          const emsSettings = new EMSSettings(
            {
              ...mockConfig,
              ...{
                emsUrl: 'https://localhost:8080',
                emsFontLibraryUrl: 'https://maps.foobar/fonts',
              },
            },
            IS_ENTERPRISE_PLUS
          );
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe('https://maps.foobar/fonts');
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test('should override internal emsLandingPageUrl', () => {
          const emsSettings = new EMSSettings(
            {
              ...mockConfig,
              ...{
                emsUrl: 'https://localhost:8080',
                emsLandingPageUrl: 'https://maps.foobar',
              },
            },
            IS_ENTERPRISE_PLUS
          );
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://maps.foobar');
        });
      });
    });
  });
});
